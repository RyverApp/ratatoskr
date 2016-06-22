/// <reference path="../typings/index.d.ts" />
import { EventEmitter } from 'events';
import * as WebSocket from 'ws';
import { Ack, Error, Other, Chat, PresenceChange, UserTyping, Ping, TeamJoin, TeamLeave, Outbound } from './interfaces.d';
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
    ok: (data: any) => void;
    error: (err: any) => void;
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
    data: Outbound;
    cause: MessageSendErrorCause;
    source: any;
    constructor(message: string, cause: MessageSendErrorCause, source?: any, data?: Outbound);
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
    nextId(): string;
    connect(): void;
    disconnect(reason?: any): void;
    protected _wsDisconnect(socket: WebSocket, reason?: any): void;
    protected _wsBind(socket: WebSocket): void;
    protected _wsInboundError(message: Error): void;
    protected _wsInboundAck(message: Ack): void;
    protected _wsInboundOther(message: Other): void;
    protected _wsMessage(evt: any): void;
    protected _wsError(evt: any): void;
    protected _wsClose(evt: any): void;
    protected _wsSend(message: Outbound, timeout?: number): Promise<Ack>;
    send(message: Outbound): Promise<Ack>;
    _ensureCanAck(ack: boolean, message: Outbound): Outbound;
    sendPing(message?: Ping, ack?: boolean): Promise<Ack>;
    sendChat(message: Chat, ack?: boolean): Promise<Ack>;
    sendPresenceChange(message: PresenceChange, ack?: boolean): Promise<Ack>;
    sendUserTyping(message: UserTyping, ack?: boolean): Promise<Ack>;
    sendTeamJoin(message: TeamJoin, ack?: boolean): Promise<Ack>;
    sendTeamLeave(message: TeamLeave, ack?: boolean): Promise<Ack>;
}
