declare module 'ratatoskr/defer' {
	/// <reference path="../typings/tsd.d.ts" />
	export interface Deferred {
	    promise: Promise<any>;
	    resolve: (value?: any) => void;
	    reject: (reason?: any) => void;
	}
	export function make(): Deferred;
	export default make;

}
declare module 'ratatoskr/interfaces' {
	/// <reference path="../typings/tsd.d.ts" />

	export interface Message {
	    id?: string;
	    type?: string;
	}

	export interface Ack {
	    type: string;
	    reply_to: string;
	    reply_type: string;
	}

	export interface ErrorMessage extends Message {
	    code: string;
	    text: string;
	}

	export interface AuthMessage extends Message {
	    authorization?: string;
	    resource?: string;
	    agent?: string;
	}

	export interface ChatMessage extends Message {
	    to: string;
	    from?: string;
	    text: string;
	    extras?: any;
	}

	export interface PresenceChangeMessage extends Message {
	    to: string;
	    from?: string;
	    presence: string;
	}

	export interface UserTypingMessage extends Message {
	    to: string;
	    from?: string;
	}

	export interface PingMessage extends Message {

	}

	export interface TeamJoinMessage extends Message {
	    to: string;
	}

	export interface TeamLeaveMessage extends Message {
	    to: string;
	}

}
declare module 'ratatoskr/client' {
	/// <reference path="../typings/tsd.d.ts" />
	import { EventEmitter } from 'events';
	import { Deferred } from './defer';
	import * as WebSocket from 'ws';
	import { Message, ChatMessage, PresenceChangeMessage, UserTypingMessage, Ack, PingMessage, TeamJoinMessage, TeamLeaveMessage } from './interfaces.d';
	export enum ConnectionStatus {
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
	export enum MessageSendErrorCause {
	    NoConnection = 0,
	    NoAuth = 1,
	    NoAck = 2,
	    Serialization = 3,
	    Transport = 4,
	    Promise = 5,
	}
	export class MessageSendError extends Error {
	    data: Message;
	    cause: MessageSendErrorCause;
	    source: any;
	    constructor(message: string, cause: MessageSendErrorCause, source?: any, data?: Message);
	}
	/**
	 */
	export class Client extends EventEmitter {
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

}
declare module 'ratatoskr/extensions/resume' {
	/// <reference path="../../typings/tsd.d.ts" />
	import { Client } from '../client';
	export interface ResumeOptions {
	    ping?: number;
	    retry?: number;
	}
	export function resume({ping, retry}?: ResumeOptions): (client: Client) => void;

}
declare module 'ratatoskr/extensions/presence-batch' {
	/// <reference path="../../typings/tsd.d.ts" />
	import { Client } from '../client';
	export interface PresenceBatchOptions {
	    timeout?: number;
	}
	export function presenceBatch({timeout}?: PresenceBatchOptions): (client: Client) => void;

}
declare module 'ratatoskr/main' {
	/// <reference path="../typings/tsd.d.ts" />
	import { Client as _Client, ConnectionStatus as _ConnectionStatus, MessageSendError as _MessageSendError, MessageSendErrorCause as _MessageSendErrorCause } from './client';
	export var Client: typeof _Client;
	export var ConnectionStatus: typeof _ConnectionStatus;
	export var MessageSendError: typeof _MessageSendError;
	export var MessageSendErrorCause: typeof _MessageSendErrorCause;
	import { resume as _resume } from './extensions/resume';
	export var resume: typeof _resume;
	import { presenceBatch as _presenceBatch } from './extensions/presence-batch';
	export var presenceBatch: typeof _presenceBatch;

}
declare module 'ratatoskr' {
	import main = require('ratatoskr/main');
	export = main;
}
