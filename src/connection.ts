/// <reference path="../typings/tsd.d.ts" />

import {EventEmitter} from 'events';
import * as url from 'url';
import * as lang from './lang';
import defer, {Deferred} from './defer';
import * as WebSocket from 'ws';

export enum ConnectionStatus {
    Disconnected = 0,
    Connecting = 1,
    Connected = 2,
    Authenticated = 3
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

interface PendingAck {
    id: number;
    message: any;
    deferred: Deferred;
    timeout: any;
}

export class Connection extends EventEmitter {
    status: ConnectionStatus = ConnectionStatus.Disconnected;
    socket: WebSocket;
    endpoint: string;
    credentials: any;

    ping: number = 10;
    timeoutSend: number = 5;
    timeoutConnect: number = 15;

    protected _needsAck: {[id:number]:PendingAck} = {};
    protected _autoId: number = 0;

    protected get _nextId() {
        return ++this._autoId;
    }

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

        var socket = new WebSocket(this.endpoint, ['ratatoskr']);

        socket.onopen = (evt) => {
            this._wsBind(socket);
        };
        socket.onerror = (evt) => {
            this.emit('transport:error', evt);
            this.disconnect(DisconnectReason.ErrorOnOpen, evt);
        };
        socket.onclose = (evt) => {
            this.emit('transport:close', evt);
            this.disconnect(DisconnectReason.CloseOnOpen, evt);
        }
    }

    disconnect(reason: DisconnectReason = DisconnectReason.Consumer, cause?: any): void {
        if (this.status === ConnectionStatus.Disconnected) {
            return;
        }

        this.status = ConnectionStatus.Disconnected;

        this._wsDestroy(this.socket), this.socket = null;

        this.emit('disconnected', {reason: reason, cause: cause});
    }

    protected _wsDisconnect() {

    }

    protected _wsDestroy(ws: WebSocket) {
        if (ws) {
            ws.onopen = null;
            ws.onerror = null;
            ws.onmessage = null;
            ws.onclose = null;
        }
    }

    protected _wsBind(ws: WebSocket) {
        try {
            this.socket = ws;
            this.socket.onopen = null;
            this.socket.onerror = this._wsError.bind(this);
            this.socket.onmessage = this._wsMessage.bind(this);
            this.socket.onclose = this._wsClose.bind(this);

            this.emit('connected');

            this.status = ConnectionStatus.Connected;
            // this._protoAuthenticate();
        } catch (err) {
            this.emit('transport:error', err);
            this.disconnect();
        }
    }

    protected _wsMessage(evt) {
        try {
            this.emit('raw:incomming', evt.data);
            var message = JSON.parse(evt.data);
            if (message.type === 'ack') {
                var id = message.reply_to;
                if (this._needsAck[id]) {
                    this._needsAck[id].deferred.resolve(message);
                }
            } else if (message.type) {
                this.emit(`${message.type}`, message);
            }
        } catch (err) {
            this.emit('protocol:error', err);
        }
    }

    protected _wsError(err) {
        this.emit('transport:error', err);
        this.disconnect();
    }

    protected _wsClose(evt) {
        this.emit('transport:close', evt);
        this.disconnect();
    }

    protected _wsSend(message, timeout: number = this.timeoutSend) {
        if (this.status < ConnectionStatus.Connected) {
            return Promise.reject(new Error('Cannot send data across a socket that is not connected.'));
        }

        try {
            var data = JSON.stringify(message);
            this.emit('raw:outgoing', data);
            this.socket.send(data);
        } catch (err) {
            this.emit('error', err);
            return Promise.reject(err);
        }

        if (message.id) {
            var id = message.id;
            var deferred = defer();
            var pending = this._needsAck[id] = {
                id: id,
                message: message,
                deferred: deferred,
                timeout: setTimeout(deferred.reject, this.timeoutSend)
            };
            var remove = () => {
                clearTimeout(pending.timeout);
                delete this._needsAck[id];
            };
            return deferred.promise.then(remove, remove);
        }
    }
}
