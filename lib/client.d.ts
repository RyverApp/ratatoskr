/// <reference path="../typings/index.d.ts" />
import { EventEmitter } from 'events';
import { Deferred } from './defer';
import * as WebSocket from 'ws';
import { Message, ChatMessage, PresenceChangeMessage, UserTypingMessage, Ack, PingMessage, TeamJoinMessage, TeamLeaveMessage } from './interfaces.d';
export declare enum ConnectionStatus {
    Disconnected = 0,
    Connecting = 1,
    Connected = 2,
    Authenticated = 3,
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
    init(client: Client): any;
}
export interface ExtensionAsFunc {
    (client: Client): void;
}
export declare enum MessageSendErrorCause {
    NoConnection = 0,
    NoAuth = 1,
    NoAck = 2,
    Serialization = 3,
    Transport = 4,
    Promise = 5,
}
export declare class MessageSendError extends Error {
    data: Message;
    cause: MessageSendErrorCause;
    source: any;
    constructor(message: string, cause: MessageSendErrorCause, source?: any, data?: Message);
}
export declare class Client extends EventEmitter {
    status: ConnectionStatus;
    resource: string;
    agent: string;
    endpoint: string;
    authorization: string | AuthorizationFunc;
    timeout: number;
    protected _socket: WebSocket;
    protected _needsAck: {
        [id: string]: PendingAckContext;
    };
    constructor({endpoint, authorization, timeout, resource, agent, extensions}?: ConnectionOptions);
    use(ext: Extension): any;
    use(ext: ExtensionAsFunc): any;
    nextId(): any;
    connect(): void;
    disconnect(reason?: any): void;
    protected _wsDisconnect(socket: WebSocket, reason?: any): void;
    protected _wsBind(socket: WebSocket): void;
    protected _wsMessage(evt: any): void;
    protected _wsError(evt: any): void;
    protected _wsClose(evt: any): void;
    protected _wsSend(message: Message, timeout?: number): Promise<Ack>;
    send(message: Message): Promise<Ack>;
    _ensureCanAck(ack: boolean, message: Message): Message;
    sendPing(message?: PingMessage, ack?: boolean): Promise<Ack>;
    sendChat(message: ChatMessage, ack?: boolean): Promise<Ack>;
    sendPresenceChange(message: PresenceChangeMessage, ack?: boolean): Promise<Ack>;
    sendUserTyping(message: UserTypingMessage, ack?: boolean): Promise<Ack>;
    sendTeamJoin(message: TeamJoinMessage, ack?: boolean): Promise<Ack>;
    sendTeamLeave(message: TeamLeaveMessage, ack?: boolean): Promise<Ack>;
}
