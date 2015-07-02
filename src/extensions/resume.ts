/// <reference path="../../typings/tsd.d.ts" />

import {Client} from '../client';

export interface ResumeOptions {
    ping?: number;
}

export function resume({ping = 10 * 1000}: ResumeOptions) {
    return (client: Client) => {
        var pingInterval: any;

        function sendPing() {
            var msg = {type: 'ping', id: client.nextId()};
            client.emit('resume:ping', msg);
            client.send(msg).then((ack) => {
                client.emit('resume:pong', ack);
            }, () => {

            });
        }

        client.on('authenticated', () => {
            pingInterval = setInterval(sendPing, ping);
        });

        client.on('disconnected', (reason) => {
            clearInterval(pingInterval), pingInterval = null;
        });
    };
}
