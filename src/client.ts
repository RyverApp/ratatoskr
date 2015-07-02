/// <reference path="../typings/tsd.d.ts" />

import {EventEmitter} from 'events';
import * as url from 'url';
import * as lang from './lang';
import defer, {Deferred} from './defer';
import * as WebSocket from 'ws';
import * as shortid from 'shortid';

export enum ConnectionStatus {
    Disconnected = 0,
    Connecting = 1,
    Connected = 2,
    Authenticated = 3
}

export interface ConnectionOptions {
    endpoint: string;
    authorization: string | AuthorizationFunc;
    timeout?: number;
    extensions?: any[];
}

export interface Ack {
    type: string;
    reply_to: string | number;
}

export interface PendingAckContext {
    id: string | number;
    message: any;
    deferred: Deferred;
    timeout: any;
}

export interface AuthorizationFunc {
    (): string;
}

export interface Extension {
    init(connection: Client);
}

export interface ExtensionAsFunc {
    (connection: Client): void;
}

export class Client extends EventEmitter {
    status: ConnectionStatus = ConnectionStatus.Disconnected;
    endpoint: string;
    authorization: string | AuthorizationFunc;
    timeout: number = 5 * 1000;

    protected _socket: WebSocket;
    protected _needsAck: {[id:string]:PendingAckContext} = {};

    constructor({endpoint, authorization, timeout = 5 * 1000, extensions = []}: ConnectionOptions) {
        super();

        this.endpoint = endpoint;
        this.authorization = authorization;
        this.timeout = timeout;

        extensions.forEach((ext) => this.use(ext));
    }

    use(ext: Extension);
    use(ext: ExtensionAsFunc);
    use(ext: any) {
        if (typeof ext.prototype.init === 'function') {
            (new ext()).init(this);
        } else if (typeof ext.init === 'function') {
            ext.init(this);
        } else if (typeof ext === 'function') {
            ext(this);
        }
    }

    nextId() {
        return shortid.generate();
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
            this._wsDisconnect(socket, evt);
        };
        socket.onclose = (evt) => {
            this.emit('transport:close', evt);
            this._wsDisconnect(socket, evt);
        }
    }

    disconnect(): void {
        if (this.status === ConnectionStatus.Disconnected) {
            return;
        }

        this._wsDisconnect(this._socket);
    }

    protected _wsDisconnect(socket: WebSocket, reason?: any): void {
        try {
            if (socket) {
                socket.onopen = null;
                socket.onerror = null;
                socket.onmessage = null;
                socket.onclose = null;
                socket.close();
            }
        } catch (err) {
            // nothing to do here, we are releasing the socket
        } finally {
            this._socket = null;
        }

        this.status = ConnectionStatus.Disconnected;

        this.emit('disconnected', reason);
    }

    protected _wsBind(socket: WebSocket): void {
        socket.onopen = null;
        socket.onerror = this._wsError.bind(this);
        socket.onmessage = this._wsMessage.bind(this);
        socket.onclose = this._wsClose.bind(this);

        this._socket = socket;

        this.status = ConnectionStatus.Connected;

        this.emit('connected');

        var auth: string;

        auth = typeof this.authorization === 'function' ? (<AuthorizationFunc>this.authorization)() : <string>this.authorization;

        this._wsSend({id: this.nextId(), type: 'auth', authorization: auth}).then((ack) => {
            this.status = ConnectionStatus.Authenticated;
            this.emit('authenticated');
        }, (err) => {
            this.emit('protocol:error', err);
            this._wsDisconnect(this._socket, err);
        });
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
                this.emit(`protocol:${message.type}`, message);
            }
        } catch (err) {
            this.emit('protocol:error', err);
        }
    }

    protected _wsError(err) {
        this.emit('transport:error', err);
        this._wsDisconnect(this._socket, err);
    }

    protected _wsClose(evt) {
        this.emit('transport:close', evt);
        this._wsDisconnect(this._socket, evt);
    }

    protected _wsSend(message, timeout: number = this.timeout): Promise<Ack> {
        if (this.status < ConnectionStatus.Connected) {
            return Promise.reject(new Error('Cannot send data across a socket that is not connected.'));
        }

        var data;
        try {
            data = JSON.stringify(message);
        } catch (err) {
            this.emit('protocol:error', err);
            return Promise.reject(err);
        }

        try {
            this.emit('raw:outgoing', data);
            this._socket.send(data);
        } catch (err) {
            this.emit('transport:error', err);
            return Promise.reject(err);
        }

        if (message.id) {
            var id = message.id;
            var deferred = defer();
            var pending = this._needsAck[id] = {
                id: id,
                message: message,
                deferred: deferred,
                timeout: setTimeout(() => deferred.reject(new Error('no ack')), timeout)
            };
            var cleanup = () => {
                clearTimeout(pending.timeout);
                delete this._needsAck[id];
            }
            return deferred.promise.then((ack) => {
                cleanup();
                return ack;
            }, (err) => {
                cleanup();
                throw err;
            });
        } else {
            return Promise.resolve();
        }
    }

    send(message): Promise<Ack> {
        if (this.status < ConnectionStatus.Authenticated) {
            return Promise.reject(new Error('Cannot send data across a socket that is not authenticated.'));
        }
        return this._wsSend(message);
    }
}
