/// <reference path="../typings/tsd.d.ts" />
var REPLACE_VARIABLE_RE = /\{([^\}]+)\}/g;
var moduleScope = this;
var empty;
function getProp(path, create, context) {
    var current = context || moduleScope;
    for (var i = 0, l = path.length; i < l && current; i++) {
        current = path[i] in current ? current[path[i]] : create ? current[path[i]] = {} : empty;
    }
    return current;
}
function hasProp(path, context) {
    var current = context;
    for (var i = 0, l = path.length; i < l && current; i++) {
        if (path[i] in current)
            current = current[path[i]];
        else
            return false;
    }
    return true;
}
function isRootPropName(name) {
    return typeof name !== 'string' || !name || name === '.';
}
function getObject(name, create, context) {
    return (isRootPropName(name)) ? context : getProp(name.split('.'), create, context);
}
exports.getObject = getObject;
function setObject(name, value, context) {
    if (isRootPropName(name))
        return context;
    var path = name.split('.'), last = path.pop(), current = getProp(path, true, context);
    return current && last ? current[last] = value : empty;
}
exports.setObject = setObject;
function mixin(to) {
    var sources = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        sources[_i - 1] = arguments[_i];
    }
    return sources.reduce(function (out, source) {
        return source ? Object.keys(source).reduce(function (out, key) {
            return out[key] = source[key], out;
        }, out) : out;
    }, to || {});
}
exports.mixin = mixin;
function exists(name, context) {
    return hasProp(name.split('.'), context);
}
exports.exists = exists;
function isDate(value) {
    return value instanceof Date;
}
exports.isDate = isDate;
function isRegExp(value) {
    return value instanceof RegExp;
}
exports.isRegExp = isRegExp;
function isString(value) {
    return typeof value === 'string';
}
exports.isString = isString;
function isArray(value) {
    return Array.isArray(value);
}
exports.isArray = isArray;
function isObject(value) {
    return typeof value === 'object';
}
exports.isObject = isObject;
function isFunction(value) {
    return typeof value === 'function';
}
exports.isFunction = isFunction;
function isObjectLike(value) {
    return value !== empty && (value === null || typeof value == 'object' || typeof value === 'function');
}
exports.isObjectLike = isObjectLike;
function isArrayLike(value) {
    return value && value.hasOwnProperty('length');
}
exports.isArrayLike = isArrayLike;
function extend(ctor) {
    var from = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        from[_i - 1] = arguments[_i];
    }
    mixin.apply(null, [ctor.prototype].concat(from));
    return ctor;
}
exports.extend = extend;
function hitch(scope, method) {
    var args = [];
    for (var _i = 2; _i < arguments.length; _i++) {
        args[_i - 2] = arguments[_i];
    }
    var fn = typeof method === 'string' ? scope[method] : method;
    return fn.bind.apply(fn, [scope].concat(args));
}
exports.hitch = hitch;
function delegateCtor() { }
function delegate(to, from) {
    delegateCtor.prototype = to;
    var value = new delegateCtor();
    delegateCtor.prototype = null;
    return from ? mixin(value, from) : value;
}
exports.delegate = delegate;
function partial(method) {
    var args = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        args[_i - 1] = arguments[_i];
    }
    return method.bind.apply(method, [null].concat(args));
}
exports.partial = partial;
function clone(value, deep) {
    if (isDate(value)) {
        return new Date(value.getTime());
    }
    else if (isRegExp(value)) {
        return new RegExp(value);
    }
    else if (isArray(value)) {
        var arrayOut = [];
        for (var i = 0, l = value.length; i < l; i++)
            arrayOut[i] = deep !== false ? clone(value[i]) : value[i];
        return arrayOut;
    }
    else if (isObject(value)) {
        var objectOut = {};
        for (var n in value)
            objectOut[n] = deep !== false ? clone(value[n]) : value[n];
        return objectOut;
    }
    else {
        return value;
    }
}
exports.clone = clone;
function param(value) {
    var pairs = [];
    for (var prop in value) {
        pairs.push(encodeURIComponent(prop) + '=' + encodeURIComponent(value[prop]));
    }
    return pairs.join('&');
}
exports.param = param;
function deparam(value) {
    if (typeof value !== 'string')
        return value;
    var segments = value.split('&'), out = {};
    for (var i = 0; i < segments.length; i++) {
        var pair = segments[i].split('=');
        out[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
    }
    return out;
}
exports.deparam = deparam;
function proxy(scope, method) {
    var args = [];
    for (var _i = 2; _i < arguments.length; _i++) {
        args[_i - 2] = arguments[_i];
    }
    var argv = arguments.length > 2 ? Array.prototype.slice.call(arguments, 2) : false;
    return function () {
        var supp = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            supp[_i - 0] = arguments[_i];
        }
        scope[method].apply(scope, args.length > 0 ? args.concat(supp) : supp);
    };
}
exports.proxy = proxy;
