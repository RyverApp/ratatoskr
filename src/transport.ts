/// <reference path="../typings/tsd.d.ts" />

import {EventEmitter} from 'events';
import * as lang from './lang';
import {Promise} from 'es6-promise';

export interface TransportOptions {

}

export enum TransportStatus {
    Disconnected,
    Connecting,
    Connected
}

function destroyWs(socket: WebSocket): WebSocket {
    try {
        socket.onopen = null;
        socket.onerror = null;
        socket.onmessage = null;
        socket.onclose = null;
        socket.close();
    } catch (err) { }

    return null;
}

export class Transport extends EventEmitter {
    status: TransportStatus = TransportStatus.Disconnected;
    socket: WebSocket;
    url: string;
    ping: number = 30;
    timeoutSend: number = 30;
    timeoutConnect: number = 15;
    credentials: any;

    constructor(props) {
        super();

        lang.mixin(this, props);
    }

    connect(): Promise<any> {
        if (this.status !== TransportStatus.Disconnected) this.disconnect();

        this.status = TransportStatus.Connecting;

        return new Promise((resolve, reject) => {
            var socket = new WebSocket(this.url, ['xmpp']);
            socket.onopen = () => {
                resolve(this._bindToSocket(socket));
            };
            socket.onerror = socket.onclose = (err) => {
                socket.onerror = socket.onclose = null;
                reject(err);
            };
        });
    }

    protected _bindToSocket(socket: WebSocket): Promise<any> {
        return new Promise((resolve, reject) => {

        });
    }

    disconnect(reason?: string) {
        if (this.status === TransportStatus.Disconnected) return;

        this.status = TransportStatus.Disconnected;
        this.socket = destroyWs(this.socket);

        this.emit('disconnected', {reason: reason || `none`});
    }

    protected _wsError(evt) {

    }

    protected _wsMessage(evt) {

    }

    protected _wsClose(evt) {

    }
}
