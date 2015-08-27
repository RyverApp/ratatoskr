/// <reference path="../../typings/tsd.d.ts" />

import {Client} from '../client';

const debug: Debug.Logger = require('debug')('ratatoskr:resume');

export interface ResumeOptions {
    ping?: number;
    retry?: number;
}

export function resume({ping = 10 * 1000, retry = 5}: ResumeOptions = {}) {
    return (client: Client) => {
        var prevAckAt: number, thisAckAt: number;
        var pingTimeout: any;
        var resumeTimeout: any;
        var resumeAttempts: number = 0;

        function doPing() {
            var msg = {};
            client.emit('resume:ping', msg);

            debug('ping=', msg);

            client.sendPing({}).then((ack) => {
                debug('pong=', ack);

                prevAckAt = thisAckAt, thisAckAt = Date.now();
                client.emit('resume:pong', ack);
                client.emit('resume:tick', thisAckAt - prevAckAt, thisAckAt, prevAckAt);
                pingTimeout = setTimeout(() => doPing(), ping);
            }, (err) => {
                debug('error=', err);

                // if the socket is closed, it will trigger a `disconnected` event, which will in turn trigger `doResume`, and then any messages
                // awaiting acknowledgement will be rejected.  In this order of events, the resume process has already begun, so we do not want to
                // disconnect here.
                if (resumeAttempts === 0) {
                    client.disconnect(new Error('pong'));
                }
            });
        }

        function doResume() {
            resumeAttempts++;

            if (retry > -1 && resumeAttempts > retry) {
                debug('quit');

                client.emit('resume:quit');
                return;
            }

            debug('attempt=', resumeAttempts);

            var resumeDelay = (Math.max(0, (4 * Math.pow(resumeAttempts, 2)) - (5 * resumeAttempts) + 4)) * 1000; // 3s, 10s, 25s, 48s, etc

            client.emit('resume', resumeDelay, resumeAttempts);

            clearTimeout(resumeTimeout), resumeTimeout = null;

            resumeTimeout = setTimeout(() => client.connect(), resumeDelay);
        }

        client.on('authenticated', () => {
            debug('authenticated');

            prevAckAt = thisAckAt || Date.now(), thisAckAt = Date.now();
            client.emit('resume:tick', thisAckAt - prevAckAt, thisAckAt, prevAckAt);
            pingTimeout = setTimeout(() => doPing(), ping);
            resumeAttempts = 0;
        });

        client.on('disconnected', (reason) => {
            debug('disconnected reason=', reason);

            clearTimeout(pingTimeout), pingTimeout = null;

            if (reason === client) {
                debug('stop');

                // disconnect was called directly, do not resume, cancel outstanding
                clearTimeout(resumeTimeout), resumeTimeout = null;
                if (resumeAttempts > 0) {
                    client.emit('resume:stop');
                }
                resumeAttempts = 0;
                return;
            }

            doResume();
        });
    };
}
