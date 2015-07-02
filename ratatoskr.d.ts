declare module 'ratatoskr/lang' {
	/// <reference path="../typings/tsd.d.ts" />
	export function getObject(name: string, create: boolean, context: any): any;
	export function setObject(name: string, value: any, context: any): any;
	export function mixin(to: any, ...sources: any[]): any;
	export function exists(name: string, context: any): boolean;
	export function isDate(value: any): boolean;
	export function isRegExp(value: any): boolean;
	export function isString(value: any): boolean;
	export function isArray(value: any): boolean;
	export function isObject(value: any): boolean;
	export function isFunction(value: any): boolean;
	export function isObjectLike(value: any): boolean;
	export function isArrayLike(value: any): boolean;
	export function extend(ctor: Function, ...from: any[]): Function;
	export function hitch(scope: any, method: string | Function, ...args: any[]): Function;
	export function delegate(to: any, from: any): any;
	export function partial(method: Function, ...args: any[]): Function;
	export function clone(value: any, deep?: boolean): any;
	export function param(value: any): string;
	export function deparam(value: string): any;
	export function proxy(scope: any, method: string, ...args: any[]): (...supp: any[]) => void;

}
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
declare module 'ratatoskr/connection' {
	/// <reference path="../typings/tsd.d.ts" />
	import { EventEmitter } from 'events';
	import { Deferred } from 'ratatoskr/defer';
	import * as WebSocket from 'ws';
	export enum ConnectionStatus {
	    Disconnected = 0,
	    Connecting = 1,
	    Connected = 2,
	    Authenticated = 3,
	}
	export interface ConnectionOptions {
	    endpoing: string;
	    authorization: string | AuthorizationFunc;
	    timeout?: number;
	    plugins?: Array<any>;
	}
	export interface PendingAckContext {
	    id: number;
	    message: any;
	    deferred: Deferred;
	    timeout: any;
	}
	export interface AuthorizationFunc {
	    (): string;
	}
	export interface Plugin {
	    init(connection: Connection): any;
	}
	export interface PluginAsFunc {
	    (connection: Connection): void;
	}
	export class Connection extends EventEmitter {
	    status: ConnectionStatus;
	    endpoint: string;
	    authorization: string | AuthorizationFunc;
	    timeout: number;
	    protected _socket: WebSocket;
	    protected _needsAck: {
	        [id: number]: PendingAckContext;
	    };
	    protected _autoId: number;
	    protected _nextId(): number;
	    constructor(props: any);
	    use(plugin: Plugin): any;
	    use(plugin: PluginAsFunc): any;
	    connect(): void;
	    disconnect(): void;
	    protected _wsDisconnect(socket: WebSocket, reason?: any): void;
	    protected _wsBind(socket: WebSocket): void;
	    protected _wsMessage(evt: any): void;
	    protected _wsError(err: any): void;
	    protected _wsClose(evt: any): void;
	    protected _wsSend(message: any, timeout?: number): Promise<void>;
	    send(message: any): Promise<void>;
	}

}
declare module 'ratatoskr/main' {
	/// <reference path="../typings/tsd.d.ts" />
	import { Connection as _Connection, ConnectionStatus as _ConnectionStatus } from 'ratatoskr/connection';
	export var Connection: typeof _Connection;
	export var ConnectionStatus: typeof _ConnectionStatus;

}
declare module 'ratatoskr' {
	import main = require('ratatoskr/main');
	export = main;
}
