/// <reference path="../typings/tsd.d.ts" /> 

const REPLACE_VARIABLE_RE = /\{([^\}]+)\}/g;

var moduleScope = this;
var empty;

function getProp(path: string[], create: boolean, context: any): any {
    var current = context || moduleScope;

    for (var i = 0, l = path.length; i < l && current; i++) {
        current = path[i] in current ? current[path[i]] : create ? current[path[i]] = {} : empty;
    }

    return current;
}

function hasProp(path: string[], context: any): boolean {
    var current = context;

    for (var i = 0, l = path.length; i < l && current; i++) {
        if (path[i] in current) current = current[path[i]];
        else return false;
    }

    return true;
}

function isRootPropName(name: string): boolean {
    return typeof name !== 'string' || !name || name === '.';
}

export function getObject(name: string, create: boolean, context: any): any {
    return (isRootPropName(name)) ? context : getProp(name.split('.'), create, context);
}

export function setObject(name: string, value: any, context: any): any {
    if (isRootPropName(name)) return context;
    var path = name.split('.'), last = path.pop(), current = getProp(path, true, context);
    return current && last ? current[last] = value : empty
}

export function mixin(to: any, ...sources: any[]): any {
    return sources.reduce((out, source) => {
        return source ? Object.keys(source).reduce((out, key) => {
            return out[key] = source[key], out;
        }, out) : out;
    }, to || {});
}

export function exists(name: string, context: any): boolean {
    return hasProp(name.split('.'), context);
}

export function isDate(value: any): boolean {
    return value instanceof Date;
}

export function isRegExp(value: any): boolean {
    return value instanceof RegExp;
}

export function isString(value: any): boolean {
    return typeof value === 'string';
}

export function isArray(value: any): boolean {
    return Array.isArray(value);
}

export function isObject(value: any): boolean {
    return typeof value === 'object';
}

export function isFunction(value: any): boolean {
    return typeof value === 'function';
}

export function isObjectLike(value: any): boolean {
    return value !== empty && (value === null || typeof value == 'object' || typeof value === 'function');
}

export function isArrayLike(value: any): boolean {
    return value && value.hasOwnProperty('length');
}

export function extend(ctor: Function, ...from: any[]): Function {
    mixin.apply(null, [ctor.prototype].concat(from));
    return ctor;
}

export function hitch(scope: any, method: string | Function, ...args: any[]): Function {
    var fn = typeof method === 'string' ? scope[method] : method;
    return fn.bind.apply(fn, [scope].concat(args));
}

function delegateCtor() {}
export function delegate(to: any, from: any): any {
    delegateCtor.prototype = to;
    var value = new delegateCtor();
    delegateCtor.prototype = null;
    return from ? mixin(value, from) : value;
}

export function partial(method: Function, ...args: any[]): Function {
    return method.bind.apply(method, [null].concat(args));
}

export function clone(value: any, deep?: boolean): any {
    if (isDate(value)) {
        return new Date(value.getTime());
    } else if (isRegExp(value)) {
        return new RegExp(value);
    } else if (isArray(value)) {
        var arrayOut = [];
        for (var i = 0, l = value.length; i < l; i++) arrayOut[i] = deep !== false ? clone(value[i]) : value[i];
        return arrayOut;
    } else if (isObject(value)) {
        var objectOut = {};
        for (var n in value) objectOut[n] = deep !== false ? clone(value[n]) : value[n];
        return objectOut;
    } else {
        return value;
    }
}

export function param(value: any): string {
    var pairs: string[] = [];
    for (var prop in value) {
        pairs.push(encodeURIComponent(prop) + '=' + encodeURIComponent(value[prop]));
    }
    return pairs.join('&');
}

export function deparam(value: string): any {
    if (typeof value !== 'string') return value;
    var segments = value.split('&'), out = {};
    for (var i = 0; i < segments.length; i++)
    {
        var pair = segments[i].split('=');
        out[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
    }
    return out;
}

export function proxy(scope: any, method: string, ...args: any[]) {
    var argv = arguments.length > 2 ? Array.prototype.slice.call(arguments, 2) : false;
    return (...supp: any[]) => {
        scope[method].apply(scope, args.length > 0 ? args.concat(supp) : supp);
    };
}
