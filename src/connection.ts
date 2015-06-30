/// <reference path="../typings/tsd.d.ts" />

import {EventEmitter} from 'events';
import * as url from 'url';
import * as lang from './lang';

export enum ConnectionStatus {
    Disconnected,
    Connecting,
    Connected
}

export enum DisconnectReason {
    Consumer,
    ErrorOnOpen,
    CloseOnOpen
}

export enum LogLevel {
    Error = 1,
    Info = 2,
    Debug = 3
}

export class Connection extends EventEmitter {
    status: ConnectionStatus = ConnectionStatus.Disconnected;
    socket: WebSocket;

    endpoint: string;
    credentials: any;
    ping: number = 10;
    timeoutSend: number = 30;
    timeoutConnect: number = 15;

    constructor(props) {
        super();

        lang.mixin(this, props);
    }

    connect(): void {
        if (this.status !== ConnectionStatus.Disconnected) {
            return;
        }

        this.status = ConnectionStatus.Connecting;

        this.emit('connecting');

        var socket = new WebSocket(this._wsEndpoint, ['ratatoskr']);

        socket.onopen = (evt) => {
            this._wsBindToSocket(socket);
        };
        socket.onerror = (evt) => {
            this._wsDestroySocket(socket);

            this.emit('disconnected', {reason: DisconnectReason.ErrorOnOpen})
        }
    }

    get _wsEndpoint(): string {
        var parsed = url.parse(this.endpoint);
        return url.format(lang.mixin(parsed, {
            query: lang.mixin(parsed.query, {
                sessionId: this._wsSessionId
            })
        }));
    }

    get _wsSessionId(): string {
        var cred = this.credentials;
        return cred && cred.sessionId || '';
    }

    _wsDestroySocket(ws: WebSocket) {
        if (ws) {
            ws.onopen = null;
            ws.onerror = null;
            ws.onmessage = null;
            ws.onclose = null;
        }
    }

    _wsBindToSocket(socket: WebSocket) {
        try {
            this.socket = socket;
            this._protoGreet();
        } catch (err) {

        }
    }

    _protoGreet() {

    }
}
