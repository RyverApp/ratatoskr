import { Client } from '../client';
import * as debug from 'debug';

const log = debug('ratatoskr:resume');

const RESUME_STEPS = [200, 1 * 1000, 5 * 1000, 10 * 1000, 30 * 1000, 60 * 1000]; // 0s, 1s, 5s, 10s, 30s, 60s

export interface ResumeOptions {
    ping?: number;
    retry?: number;
    steps?: Array<number>;
    jitter?: number;
}

export function resume({ ping = 10 * 1000, retry = 6, steps = RESUME_STEPS, jitter = 1800 }: ResumeOptions = {}) {
    return (client: Client) => {
        let prevAckAt: number, thisAckAt: number;
        let pingTimeout: any;
        let resumeTimeout: any;
        let resumeAttempts: number = 0;

        function doPing() {
            const msg = {};
            client.emit('resume:ping', msg);

            log('ping=', msg);

            client.sendPing().then((ack) => {
                log('pong=', ack);

                prevAckAt = thisAckAt, thisAckAt = Date.now();
                client.emit('resume:pong', ack);
                client.emit('resume:tick', thisAckAt - prevAckAt, thisAckAt, prevAckAt);
                pingTimeout = setTimeout(() => doPing(), ping);
            }, (err) => {
                log('error=', err);

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
                log('quit');

                client.emit('resume:quit');
                return;
            }

            const resumeDelay = steps[Math.min(resumeAttempts, steps.length) - 1];

            log('attempt=', resumeAttempts, resumeDelay);

            client.emit('resume', resumeDelay, resumeAttempts);

            clearTimeout(resumeTimeout), resumeTimeout = null;

            resumeTimeout = setTimeout(() => client.connect(), resumeDelay);
        }

        client.on('authenticated', () => {
            log('authenticated');

            prevAckAt = thisAckAt || Date.now(), thisAckAt = Date.now();
            client.emit('resume:tick', thisAckAt - prevAckAt, thisAckAt, prevAckAt);
            pingTimeout = setTimeout(() => doPing(), ping);
            resumeAttempts = 0;
        });

        client.on('disconnected', (reason) => {
            log('disconnected reason=', reason);

            clearTimeout(pingTimeout), pingTimeout = null;

            if (reason === client) {
                log('stop');

                // disconnect was called directly, do not resume, cancel outstanding
                clearTimeout(resumeTimeout), resumeTimeout = null;
                if (resumeAttempts > 0) {
                    client.emit('resume:stop');
                }
                resumeAttempts = 0;
                return;
            }

            if (jitter > 0 && resumeAttempts === 0) {
                const randomized = jitter * Math.random();
                log('jitter first resume attempt=', randomized);
                setTimeout(() => doResume(), randomized);
            } else {
                doResume();
            }            
        });
    };
}
