/// <reference path="../typings/tsd.d.ts" />

import {EventEmitter} from 'events';
import * as url from 'url';
import defer, {Deferred} from './defer';
import * as WebSocket from 'ws';
import * as shortid from 'shortid';
import {Message, AuthMessage, ChatMessage, PresenceChangeMessage, UserTypingMessage, Ack, PingMessage, TeamJoinMessage, TeamLeaveMessage} from './interfaces.d';

const debug: Debug.Logger = require('debug')('ratatoskr:client');

export enum ConnectionStatus {
    Disconnected = 0,
    Connecting = 1,
    Connected = 2,
    Authenticated = 3
}

export interface ConnectionOptions {
    endpoint?: string;
    authorization?: string | AuthorizationFunc;
    resource?: string;
    agent?: string;
    timeout?: number;
    extensions?: any[];
}


export interface PendingAckContext {
    id: string;
    message: any;
    deferred: Deferred;
    timeout: any;
}

export interface AuthorizationFunc {
    (): string;
}

export interface Extension {
    init(client: Client);
}

export interface ExtensionAsFunc {
    (client: Client): void;
}

export enum MessageSendErrorCause {
    NoConnection = 0,
    NoAuth = 1,
    NoAck = 2,
    Serialization = 3,
    Transport = 4,
    Promise = 5
}

export class MessageSendError extends Error {
    data: Message;
    cause: MessageSendErrorCause;
    source: any;

    constructor(message: string, cause: MessageSendErrorCause, source?: any, data?: Message) {
        super(message);

        this.cause = cause;
        this.source = source;
        this.data = data;
    }
}

/**
 */
export class Client extends EventEmitter {
    status: ConnectionStatus = ConnectionStatus.Disconnected;
    resource: string;
    agent: string;
    endpoint: string;
    authorization: string | AuthorizationFunc;
    timeout: number = 5 * 1000;

    protected _socket: WebSocket;
    protected _needsAck: {[id:string]:PendingAckContext} = {};

    constructor({endpoint, authorization, timeout = 5 * 1000, resource = '', agent = 'Ratatoskr', extensions = []}: ConnectionOptions = {}) {
        super();

        this.agent = agent;
        this.resource = resource;
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

        debug('connect endpoint=', this.endpoint);

        this.emit('connecting');

        var socket = new WebSocket(this.endpoint, ['ratatoskr']);

        socket.onopen = (evt) => {
            debug('connect onopen=', evt);

            this._wsBind(socket);
        };
        socket.onerror = (evt) => {
            debug('connect onerror=', evt);

            this.emit('transport:error', evt);
            this._wsDisconnect(socket, evt);
        };
        socket.onclose = (evt) => {
            debug('connect onclose=', evt);

            this.emit('transport:close', evt);
            this._wsDisconnect(socket, evt);
        }
    }

    disconnect(reason: any = this): void {
        this._wsDisconnect(this._socket, reason);
    }

    protected _wsDisconnect(socket: WebSocket, reason?: any): void {
        debug('disconnect reason=', reason);

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

        Object.keys(this._needsAck).forEach((k) => {
            this._needsAck[k].deferred.reject(reason);
        }), this._needsAck = {};

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

        var message = <AuthMessage>{
            id: this.nextId(),
            type: 'auth',
            authorization: auth
        };

        if (this.agent) message.agent = this.agent;
        if (this.resource) message.resource = this.resource;

        this._wsSend(message).then((ack) => {
            debug('authentication ack=', ack);

            this.status = ConnectionStatus.Authenticated;
            this.emit('authenticated', ack);
        }, (err) => {
            debug('authentication error=', err);

            this.emit('protocol:error', err);
            this._wsDisconnect(this._socket, err);
        });
    }

    protected _wsMessage(evt) {
        try {
            this.emit('raw:incomming', evt.data);
            var message = JSON.parse(evt.data);
            if (message.type === 'error') {
                if (message.code === 'auth_failed') {
                    debug('authentication failure=', message);

                    this._wsDisconnect(this._socket, message);
                } else {
                    this.emit('protocol:error', message);
                }
            } else if (message.type === 'ack') {
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

    protected _wsError(evt) {
        this.emit('transport:error', evt);
        this._wsDisconnect(this._socket, evt);
    }

    protected _wsClose(evt) {
        this.emit('transport:close', evt);
        this._wsDisconnect(this._socket, evt);
    }

    protected _wsSend(message: Message, timeout: number = this.timeout): Promise<Ack> {
        if (this.status < ConnectionStatus.Connected) {
            return Promise.reject(new MessageSendError('Cannot send data across a socket that is not connected.', MessageSendErrorCause.NoAuth));
        }

        debug('send message=', message);

        var data;
        try {
            data = JSON.stringify(message);
        } catch (err) {
            this.emit('protocol:error', err);
            return Promise.reject(new MessageSendError('Could not serialize message.', MessageSendErrorCause.Serialization, err, message));
        }

        this.emit('raw:outgoing', data);

        try {
            const socket = this._socket;
            socket.send(data);
            if (socket !== this._socket) {
                throw new Error('Socket was destroyed during send.');
            }
        } catch (err) {
            debug('send exception=', err);
            this.emit('transport:error', err);
            return Promise.reject(new MessageSendError('An error occurred in the transport.', MessageSendErrorCause.Transport, err, message));
        }

        if (message.id) {
            var id = message.id;
            var deferred = defer();
            var pending = this._needsAck[id] = {
                id: id,
                message: message,
                deferred: deferred,
                timeout: setTimeout(() => {
                    debug('send timeout');
                    deferred.reject(new MessageSendError('Did not receive acknowledgement in the timeout period.', MessageSendErrorCause.NoAck, void 0, message))
                }, timeout)
            };
            var cleanup = () => {
                clearTimeout(pending.timeout);
                delete this._needsAck[id];
            }
            return deferred.promise.then((ack) => {
                debug('send ack=', ack);

                cleanup();
                return ack;
            }, (err) => {
                debug('send error=', err);

                cleanup();
                throw new MessageSendError('An error occurred during promise resolution', MessageSendErrorCause.Promise, err, message);
            });
        } else {
            return Promise.resolve();
        }
    }

    send(message: Message): Promise<Ack> {
        if (this.status < ConnectionStatus.Authenticated) {
            return Promise.reject(new MessageSendError('Cannot send data across a socket that is not authenticated.', MessageSendErrorCause.NoAuth, void 0, message));
        }
        return this._wsSend(message);
    }

    _ensureCanAck(ack: boolean, message: Message): Message {
        if (ack && !('id' in message)) { message.id = this.nextId(); }
        return message;
    }

    sendPing(message: PingMessage = {}, ack: boolean = true): Promise<Ack> {
        message.type = 'ping';
        return this.send(this._ensureCanAck(ack, message));
    }

    sendChat(message: ChatMessage, ack: boolean = true): Promise<Ack> {
        message.type = 'chat';
        return this.send(this._ensureCanAck(ack, message));
    }

    sendPresenceChange(message: PresenceChangeMessage, ack: boolean = false): Promise<Ack> {
        message.type = 'presence_change';
        return this.send(this._ensureCanAck(ack, message));
    }

    sendUserTyping(message: UserTypingMessage, ack: boolean = false): Promise<Ack> {
        message.type = 'user_typing';
        return this.send(this._ensureCanAck(ack, message));
    }

    sendTeamJoin(message: TeamJoinMessage, ack: boolean = false): Promise<Ack> {
        message.type = 'team_join';
        return this.send(this._ensureCanAck(ack, message));
    }

    sendTeamLeave(message: TeamLeaveMessage, ack: boolean = false): Promise<Ack> {
        message.type = 'team_leave';
        return this.send(this._ensureCanAck(ack, message));
    }
}
