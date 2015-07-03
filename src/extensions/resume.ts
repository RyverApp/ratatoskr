/// <reference path="../../typings/tsd.d.ts" />

import {Client} from '../client';

export interface ResumeOptions {
    ping?: number;
    retry?: number;
}

export function resume({ping = 10 * 1000, retry = 5}: ResumeOptions) {
    return (client: Client) => {
        var pingInterval: any;
        var resumeTimeout: any;
        var resumeAttempts: number = 0;

        function doPing() {
            var msg = {};
            client.emit('resume:ping', msg);
            client.sendPing({}).then((ack) => {
                client.emit('resume:pong', ack);
            }, () => {
                client.disconnect(new Error('pong'));
            });
        }

        function doResume() {
            resumeAttempts++;

            if (retry > -1 && resumeAttempts > retry) {
                client.emit('resume:quit');
                return;
            }

            var resumeDelay = (Math.max(0, (4 * Math.pow(resumeAttempts, 2)) - (5 * resumeAttempts) + 4)) * 1000; // 3s, 10s, 25s, 48s, etc

            client.emit('resume', resumeDelay, resumeAttempts);

            clearTimeout(resumeTimeout), resumeTimeout = null;

            resumeTimeout = setTimeout(() => client.connect(), resumeDelay);
        }

        client.on('authenticated', () => {
            pingInterval = setInterval(doPing, ping);
            resumeAttempts = 0;
        });

        client.on('disconnected', (reason) => {
            clearInterval(pingInterval), pingInterval = null;

            if (reason === client) {
                // disconnect was called directly, do not resume, cancel outstanding
                clearTimeout(resumeTimeout), resumeTimeout = null;
                return;
            }

            doResume();
        });
    };
}
