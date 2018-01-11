(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('ws')) :
	typeof define === 'function' && define.amd ? define(['exports', 'ws'], factory) :
	(factory((global.Ratatoskr = {}),global.WebSocket));
}(this, (function (exports,WebSocket) { 'use strict';

/*! *****************************************************************************
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the Apache License, Version 2.0 (the "License"); you may not use
this file except in compliance with the License. You may obtain a copy of the
License at http://www.apache.org/licenses/LICENSE-2.0

THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
MERCHANTABLITY OR NON-INFRINGEMENT.

See the Apache Version 2.0 License for specific language governing permissions
and limitations under the License.
***************************************************************************** */
/* global Reflect, Promise */

var extendStatics = Object.setPrototypeOf ||
    ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
    function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };

function __extends(d, b) {
    extendStatics(d, b);
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
}

var domain;

// This constructor is used to store event handlers. Instantiating this is
// faster than explicitly calling `Object.create(null)` to get a "clean" empty
// object (tested with v8 v4.9).
function EventHandlers() {}
EventHandlers.prototype = Object.create(null);

function EventEmitter() {
  EventEmitter.init.call(this);
}
// nodejs oddity
// require('events') === require('events').EventEmitter
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.usingDomains = false;

EventEmitter.prototype.domain = undefined;
EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

EventEmitter.init = function() {
  this.domain = null;
  if (EventEmitter.usingDomains) {
    // if there is an active domain, then attach to it.
    if (domain.active && !(this instanceof domain.Domain)) {
      this.domain = domain.active;
    }
  }

  if (!this._events || this._events === Object.getPrototypeOf(this)._events) {
    this._events = new EventHandlers();
    this._eventsCount = 0;
  }

  this._maxListeners = this._maxListeners || undefined;
};

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function setMaxListeners(n) {
  if (typeof n !== 'number' || n < 0 || isNaN(n))
    throw new TypeError('"n" argument must be a positive number');
  this._maxListeners = n;
  return this;
};

function $getMaxListeners(that) {
  if (that._maxListeners === undefined)
    return EventEmitter.defaultMaxListeners;
  return that._maxListeners;
}

EventEmitter.prototype.getMaxListeners = function getMaxListeners() {
  return $getMaxListeners(this);
};

// These standalone emit* functions are used to optimize calling of event
// handlers for fast cases because emit() itself often has a variable number of
// arguments and can be deoptimized because of that. These functions always have
// the same number of arguments and thus do not get deoptimized, so the code
// inside them can execute faster.
function emitNone(handler, isFn, self) {
  if (isFn)
    handler.call(self);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self);
  }
}
function emitOne(handler, isFn, self, arg1) {
  if (isFn)
    handler.call(self, arg1);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self, arg1);
  }
}
function emitTwo(handler, isFn, self, arg1, arg2) {
  if (isFn)
    handler.call(self, arg1, arg2);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self, arg1, arg2);
  }
}
function emitThree(handler, isFn, self, arg1, arg2, arg3) {
  if (isFn)
    handler.call(self, arg1, arg2, arg3);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self, arg1, arg2, arg3);
  }
}

function emitMany(handler, isFn, self, args) {
  if (isFn)
    handler.apply(self, args);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].apply(self, args);
  }
}

EventEmitter.prototype.emit = function emit(type) {
  var er, handler, len, args, i, events, domain;
  var needDomainExit = false;
  var doError = (type === 'error');

  events = this._events;
  if (events)
    doError = (doError && events.error == null);
  else if (!doError)
    return false;

  domain = this.domain;

  // If there is no 'error' event listener then throw.
  if (doError) {
    er = arguments[1];
    if (domain) {
      if (!er)
        er = new Error('Uncaught, unspecified "error" event');
      er.domainEmitter = this;
      er.domain = domain;
      er.domainThrown = false;
      domain.emit('error', er);
    } else if (er instanceof Error) {
      throw er; // Unhandled 'error' event
    } else {
      // At least give some kind of context to the user
      var err = new Error('Uncaught, unspecified "error" event. (' + er + ')');
      err.context = er;
      throw err;
    }
    return false;
  }

  handler = events[type];

  if (!handler)
    return false;

  var isFn = typeof handler === 'function';
  len = arguments.length;
  switch (len) {
    // fast cases
    case 1:
      emitNone(handler, isFn, this);
      break;
    case 2:
      emitOne(handler, isFn, this, arguments[1]);
      break;
    case 3:
      emitTwo(handler, isFn, this, arguments[1], arguments[2]);
      break;
    case 4:
      emitThree(handler, isFn, this, arguments[1], arguments[2], arguments[3]);
      break;
    // slower
    default:
      args = new Array(len - 1);
      for (i = 1; i < len; i++)
        args[i - 1] = arguments[i];
      emitMany(handler, isFn, this, args);
  }

  if (needDomainExit)
    domain.exit();

  return true;
};

function _addListener(target, type, listener, prepend) {
  var m;
  var events;
  var existing;

  if (typeof listener !== 'function')
    throw new TypeError('"listener" argument must be a function');

  events = target._events;
  if (!events) {
    events = target._events = new EventHandlers();
    target._eventsCount = 0;
  } else {
    // To avoid recursion in the case that type === "newListener"! Before
    // adding it to the listeners, first emit "newListener".
    if (events.newListener) {
      target.emit('newListener', type,
                  listener.listener ? listener.listener : listener);

      // Re-assign `events` because a newListener handler could have caused the
      // this._events to be assigned to a new object
      events = target._events;
    }
    existing = events[type];
  }

  if (!existing) {
    // Optimize the case of one listener. Don't need the extra array object.
    existing = events[type] = listener;
    ++target._eventsCount;
  } else {
    if (typeof existing === 'function') {
      // Adding the second element, need to change to array.
      existing = events[type] = prepend ? [listener, existing] :
                                          [existing, listener];
    } else {
      // If we've already got an array, just append.
      if (prepend) {
        existing.unshift(listener);
      } else {
        existing.push(listener);
      }
    }

    // Check for listener leak
    if (!existing.warned) {
      m = $getMaxListeners(target);
      if (m && m > 0 && existing.length > m) {
        existing.warned = true;
        var w = new Error('Possible EventEmitter memory leak detected. ' +
                            existing.length + ' ' + type + ' listeners added. ' +
                            'Use emitter.setMaxListeners() to increase limit');
        w.name = 'MaxListenersExceededWarning';
        w.emitter = target;
        w.type = type;
        w.count = existing.length;
        emitWarning(w);
      }
    }
  }

  return target;
}
function emitWarning(e) {
  typeof console.warn === 'function' ? console.warn(e) : console.log(e);
}
EventEmitter.prototype.addListener = function addListener(type, listener) {
  return _addListener(this, type, listener, false);
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.prependListener =
    function prependListener(type, listener) {
      return _addListener(this, type, listener, true);
    };

function _onceWrap(target, type, listener) {
  var fired = false;
  function g() {
    target.removeListener(type, g);
    if (!fired) {
      fired = true;
      listener.apply(target, arguments);
    }
  }
  g.listener = listener;
  return g;
}

EventEmitter.prototype.once = function once(type, listener) {
  if (typeof listener !== 'function')
    throw new TypeError('"listener" argument must be a function');
  this.on(type, _onceWrap(this, type, listener));
  return this;
};

EventEmitter.prototype.prependOnceListener =
    function prependOnceListener(type, listener) {
      if (typeof listener !== 'function')
        throw new TypeError('"listener" argument must be a function');
      this.prependListener(type, _onceWrap(this, type, listener));
      return this;
    };

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener =
    function removeListener(type, listener) {
      var list, events, position, i, originalListener;

      if (typeof listener !== 'function')
        throw new TypeError('"listener" argument must be a function');

      events = this._events;
      if (!events)
        return this;

      list = events[type];
      if (!list)
        return this;

      if (list === listener || (list.listener && list.listener === listener)) {
        if (--this._eventsCount === 0)
          this._events = new EventHandlers();
        else {
          delete events[type];
          if (events.removeListener)
            this.emit('removeListener', type, list.listener || listener);
        }
      } else if (typeof list !== 'function') {
        position = -1;

        for (i = list.length; i-- > 0;) {
          if (list[i] === listener ||
              (list[i].listener && list[i].listener === listener)) {
            originalListener = list[i].listener;
            position = i;
            break;
          }
        }

        if (position < 0)
          return this;

        if (list.length === 1) {
          list[0] = undefined;
          if (--this._eventsCount === 0) {
            this._events = new EventHandlers();
            return this;
          } else {
            delete events[type];
          }
        } else {
          spliceOne(list, position);
        }

        if (events.removeListener)
          this.emit('removeListener', type, originalListener || listener);
      }

      return this;
    };

EventEmitter.prototype.removeAllListeners =
    function removeAllListeners(type) {
      var listeners, events;

      events = this._events;
      if (!events)
        return this;

      // not listening for removeListener, no need to emit
      if (!events.removeListener) {
        if (arguments.length === 0) {
          this._events = new EventHandlers();
          this._eventsCount = 0;
        } else if (events[type]) {
          if (--this._eventsCount === 0)
            this._events = new EventHandlers();
          else
            delete events[type];
        }
        return this;
      }

      // emit removeListener for all listeners on all events
      if (arguments.length === 0) {
        var keys = Object.keys(events);
        for (var i = 0, key; i < keys.length; ++i) {
          key = keys[i];
          if (key === 'removeListener') continue;
          this.removeAllListeners(key);
        }
        this.removeAllListeners('removeListener');
        this._events = new EventHandlers();
        this._eventsCount = 0;
        return this;
      }

      listeners = events[type];

      if (typeof listeners === 'function') {
        this.removeListener(type, listeners);
      } else if (listeners) {
        // LIFO order
        do {
          this.removeListener(type, listeners[listeners.length - 1]);
        } while (listeners[0]);
      }

      return this;
    };

EventEmitter.prototype.listeners = function listeners(type) {
  var evlistener;
  var ret;
  var events = this._events;

  if (!events)
    ret = [];
  else {
    evlistener = events[type];
    if (!evlistener)
      ret = [];
    else if (typeof evlistener === 'function')
      ret = [evlistener.listener || evlistener];
    else
      ret = unwrapListeners(evlistener);
  }

  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  if (typeof emitter.listenerCount === 'function') {
    return emitter.listenerCount(type);
  } else {
    return listenerCount.call(emitter, type);
  }
};

EventEmitter.prototype.listenerCount = listenerCount;
function listenerCount(type) {
  var events = this._events;

  if (events) {
    var evlistener = events[type];

    if (typeof evlistener === 'function') {
      return 1;
    } else if (evlistener) {
      return evlistener.length;
    }
  }

  return 0;
}

EventEmitter.prototype.eventNames = function eventNames() {
  return this._eventsCount > 0 ? Reflect.ownKeys(this._events) : [];
};

// About 1.5x faster than the two-arg version of Array#splice().
function spliceOne(list, index) {
  for (var i = index, k = i + 1, n = list.length; k < n; i += 1, k += 1)
    list[i] = list[k];
  list.pop();
}

function arrayClone(arr, i) {
  var copy = new Array(i);
  while (i--)
    copy[i] = arr[i];
  return copy;
}

function unwrapListeners(arr) {
  var ret = new Array(arr.length);
  for (var i = 0; i < ret.length; ++i) {
    ret[i] = arr[i].listener || arr[i];
  }
  return ret;
}

var shortid = require('shortid');
var debug = require('debug')('ratatoskr:client');

(function (ConnectionStatus) {
    ConnectionStatus[ConnectionStatus["Disconnected"] = 0] = "Disconnected";
    ConnectionStatus[ConnectionStatus["Connecting"] = 1] = "Connecting";
    ConnectionStatus[ConnectionStatus["Connected"] = 2] = "Connected";
    ConnectionStatus[ConnectionStatus["Authenticated"] = 3] = "Authenticated";
})(exports.ConnectionStatus || (exports.ConnectionStatus = {}));

(function (MessageSendErrorCause) {
    MessageSendErrorCause[MessageSendErrorCause["NoConnection"] = 0] = "NoConnection";
    MessageSendErrorCause[MessageSendErrorCause["NoAuth"] = 1] = "NoAuth";
    MessageSendErrorCause[MessageSendErrorCause["NoAck"] = 2] = "NoAck";
    MessageSendErrorCause[MessageSendErrorCause["Serialization"] = 3] = "Serialization";
    MessageSendErrorCause[MessageSendErrorCause["Transport"] = 4] = "Transport";
    MessageSendErrorCause[MessageSendErrorCause["Promise"] = 5] = "Promise";
})(exports.MessageSendErrorCause || (exports.MessageSendErrorCause = {}));
var MessageSendError = /** @class */ (function (_super) {
    __extends(MessageSendError, _super);
    function MessageSendError(message, cause, source, data) {
        var _this = _super.call(this, message) || this;
        _this.cause = cause;
        _this.source = source;
        _this.data = data;
        return _this;
    }
    return MessageSendError;
}(Error));
/**
 */
var Client = /** @class */ (function (_super) {
    __extends(Client, _super);
    function Client(_a) {
        var _b = _a === void 0 ? {} : _a, endpoint = _b.endpoint, authorization = _b.authorization, _c = _b.timeout, timeout = _c === void 0 ? 5 * 1000 : _c, _d = _b.resource, resource = _d === void 0 ? '' : _d, _e = _b.agent, agent = _e === void 0 ? 'Ratatoskr' : _e, _f = _b.extensions, extensions = _f === void 0 ? [] : _f;
        var _this = _super.call(this) || this;
        _this.status = exports.ConnectionStatus.Disconnected;
        _this.timeout = 5 * 1000;
        _this._needsAck = {};
        _this.agent = agent;
        _this.resource = resource;
        _this.endpoint = endpoint;
        _this.authorization = authorization;
        _this.timeout = timeout;
        extensions.forEach(function (ext) { return _this.use(ext); });
        return _this;
    }
    Client.prototype.use = function (ext) {
        if (typeof ext.prototype.init === 'function') {
            (new ext()).init(this);
        }
        else if (typeof ext.init === 'function') {
            ext.init(this);
        }
        else if (typeof ext === 'function') {
            ext(this);
        }
    };
    Client.prototype.nextId = function () {
        return shortid.generate();
    };
    Client.prototype.connect = function () {
        var _this = this;
        if (this.status !== exports.ConnectionStatus.Disconnected) {
            return;
        }
        this.status = exports.ConnectionStatus.Connecting;
        debug('connect endpoint=', this.endpoint);
        this.emit('connecting');
        var socket = new WebSocket(this.endpoint, ['ratatoskr']);
        socket.onopen = function (evt) {
            debug('connect onopen=', evt);
            _this._wsBind(socket);
        };
        socket.onerror = function (evt) {
            debug('connect onerror=', evt);
            _this.emit('transport:error', evt);
            _this._wsDisconnect(socket, evt);
        };
        socket.onclose = function (evt) {
            debug('connect onclose=', evt);
            _this.emit('transport:close', evt);
            _this._wsDisconnect(socket, evt);
        };
    };
    Client.prototype.disconnect = function (reason) {
        if (reason === void 0) { reason = this; }
        this._wsDisconnect(this._socket, reason);
    };
    Client.prototype._wsDisconnect = function (socket, reason) {
        var _this = this;
        debug('disconnect reason=', reason);
        try {
            if (socket) {
                socket.onopen = null;
                socket.onerror = null;
                socket.onmessage = null;
                socket.onclose = null;
                socket.close();
            }
        }
        catch (err) {
            // nothing to do here, we are releasing the socket
        }
        finally {
            this._socket = null;
        }
        Object.keys(this._needsAck).forEach(function (k) {
            _this._needsAck[k].error(reason);
        }), this._needsAck = {};
        this.status = exports.ConnectionStatus.Disconnected;
        this.emit('disconnected', reason);
    };
    Client.prototype._wsBind = function (socket) {
        var _this = this;
        socket.onopen = null;
        socket.onerror = this._wsError.bind(this);
        socket.onmessage = this._wsMessage.bind(this);
        socket.onclose = this._wsClose.bind(this);
        this._socket = socket;
        this.status = exports.ConnectionStatus.Connected;
        this.emit('connected');
        var auth;
        auth = typeof this.authorization === 'function' ? this.authorization() : this.authorization;
        var message = {
            id: this.nextId(),
            type: 'auth',
            authorization: auth
        };
        if (this.agent)
            message.agent = this.agent;
        if (this.resource)
            message.resource = this.resource;
        this._wsSend(message).then(function (ack) {
            debug('authentication ack=', ack);
            _this.status = exports.ConnectionStatus.Authenticated;
            _this.emit('authenticated', ack);
        }, function (err) {
            debug('authentication error=', err);
            _this.emit('protocol:error', err);
            _this._wsDisconnect(_this._socket, err);
        });
    };
    Client.prototype._wsInboundError = function (message) {
        if (message.code === 'auth_failed') {
            debug('authentication failure=', message);
            this._wsDisconnect(this._socket, message);
        }
        else {
            this.emit('protocol:error', message);
            var ack = this._needsAck[message.id];
            if (ack) {
                ack.error(message);
            }
        }
    };
    Client.prototype._wsInboundAck = function (message) {
        var ack = this._needsAck[message.reply_to];
        if (ack) {
            message.error ? ack.error(message.error) : ack.ok(message);
        }
    };
    Client.prototype._wsInboundOther = function (message) {
        this.emit("" + message.type, message);
    };
    Client.prototype._wsMessage = function (evt) {
        try {
            this.emit('raw:incomming', evt.data);
            var message = JSON.parse(evt.data);
            debug('receive=', message);
            if (message.type === 'error') {
                this._wsInboundError(message);
            }
            else if (message.type === 'ack') {
                this._wsInboundAck(message);
            }
            else {
                this._wsInboundOther(message);
            }
        }
        catch (err) {
            this.emit('protocol:error', err);
        }
    };
    Client.prototype._wsError = function (evt) {
        this.emit('transport:error', evt);
        this._wsDisconnect(this._socket, evt);
    };
    Client.prototype._wsClose = function (evt) {
        this.emit('transport:close', evt);
        this._wsDisconnect(this._socket, evt);
    };
    Client.prototype._wsSend = function (message, timeout) {
        var _this = this;
        if (timeout === void 0) { timeout = this.timeout; }
        if (this.status < exports.ConnectionStatus.Connected) {
            return Promise.reject(new MessageSendError('Cannot send data across a socket that is not connected.', exports.MessageSendErrorCause.NoAuth));
        }
        debug('send=', message);
        var data;
        try {
            data = JSON.stringify(message);
        }
        catch (err) {
            this.emit('protocol:error', err);
            return Promise.reject(new MessageSendError('Could not serialize message.', exports.MessageSendErrorCause.Serialization, err, message));
        }
        this.emit('raw:outgoing', data);
        try {
            var socket = this._socket;
            socket.send(data);
            if (socket !== this._socket) {
                throw new Error('Socket was destroyed during send.');
            }
        }
        catch (err) {
            debug('send err=', err);
            this.emit('transport:error', err);
            return Promise.reject(new MessageSendError('An error occurred in the transport.', exports.MessageSendErrorCause.Transport, err, message));
        }
        if (message.id) {
            var id_1 = message.id;
            var ctx_1 = this._needsAck[id_1] = { id: id_1 };
            var promise = new Promise(function (ok, err) {
                ctx_1.ok = ok;
                ctx_1.error = err;
            });
            var timer_1 = setTimeout(function () {
                debug('ack timeout=', timeout);
                ctx_1.error(new MessageSendError('Did not receive acknowledgement in the timeout period.', exports.MessageSendErrorCause.NoAck, void 0, message));
            }, timeout);
            var cleanup_1 = function () {
                clearTimeout(timer_1);
                delete _this._needsAck[id_1];
            };
            return promise.then(function (ack) {
                debug('ack=', ack);
                cleanup_1();
                return ack;
            }, function (err) {
                debug('ack error=', err);
                cleanup_1();
                throw new MessageSendError('An error occurred during promise resolution', exports.MessageSendErrorCause.Promise, err, message);
            });
        }
        else {
            return Promise.resolve(null);
        }
    };
    Client.prototype.send = function (message) {
        if (this.status < exports.ConnectionStatus.Authenticated) {
            return Promise.reject(new MessageSendError('Cannot send data across a socket that is not authenticated.', exports.MessageSendErrorCause.NoAuth, void 0, message));
        }
        return this._wsSend(message);
    };
    Client.prototype._ensureCanAck = function (ack, message) {
        if (ack && !('id' in message)) {
            message.id = this.nextId();
        }
        return message;
    };
    Client.prototype.sendPing = function (message, ack) {
        if (message === void 0) { message = {}; }
        if (ack === void 0) { ack = true; }
        message.type = 'ping';
        return this.send(this._ensureCanAck(ack, message));
    };
    Client.prototype.sendChat = function (message, ack) {
        if (ack === void 0) { ack = true; }
        message.type = 'chat';
        return this.send(this._ensureCanAck(ack, message));
    };
    Client.prototype.sendPresenceChange = function (message, ack) {
        if (ack === void 0) { ack = false; }
        message.type = 'presence_change';
        return this.send(this._ensureCanAck(ack, message));
    };
    Client.prototype.sendUserTyping = function (message, ack) {
        if (ack === void 0) { ack = false; }
        message.type = 'user_typing';
        return this.send(this._ensureCanAck(ack, message));
    };
    Client.prototype.sendTeamJoin = function (message, ack) {
        if (ack === void 0) { ack = false; }
        message.type = 'team_join';
        return this.send(this._ensureCanAck(ack, message));
    };
    Client.prototype.sendTeamLeave = function (message, ack) {
        if (ack === void 0) { ack = false; }
        message.type = 'team_leave';
        return this.send(this._ensureCanAck(ack, message));
    };
    return Client;
}(EventEmitter));

var debug$1 = require('debug')('ratatoskr:resume');
var RESUME_STEPS = [200, 1 * 1000, 5 * 1000, 10 * 1000, 30 * 1000, 60 * 1000]; // 0s, 1s, 5s, 10s, 30s, 60s
function resume(_a) {
    var _b = _a === void 0 ? {} : _a, _c = _b.ping, ping = _c === void 0 ? 10 * 1000 : _c, _d = _b.retry, retry = _d === void 0 ? 6 : _d, _e = _b.steps, steps = _e === void 0 ? RESUME_STEPS : _e, _f = _b.jitter, jitter = _f === void 0 ? 1800 : _f;
    return function (client) {
        var prevAckAt, thisAckAt;
        var pingTimeout;
        var resumeTimeout;
        var resumeAttempts = 0;
        function doPing() {
            var msg = {};
            client.emit('resume:ping', msg);
            debug$1('ping=', msg);
            client.sendPing().then(function (ack) {
                debug$1('pong=', ack);
                prevAckAt = thisAckAt, thisAckAt = Date.now();
                client.emit('resume:pong', ack);
                client.emit('resume:tick', thisAckAt - prevAckAt, thisAckAt, prevAckAt);
                pingTimeout = setTimeout(function () { return doPing(); }, ping);
            }, function (err) {
                debug$1('error=', err);
                // if the socket is closed, it will trigger a `disconnected` event, which will in turn trigger `doResume`, and then any messages
                // awaiting acknowledgement will be rejected.  In this order of events, the resume process has already begun, so we do not want to
                // disconnect here.
                if (resumeAttempts === 0) {
                    client.disconnect(new Error('pong'));
                }
            });
        }
        function doResume() {
            resumeAttempts++;
            if (retry > -1 && resumeAttempts > retry) {
                debug$1('quit');
                client.emit('resume:quit');
                return;
            }
            var resumeDelay = steps[Math.min(resumeAttempts, steps.length) - 1];
            debug$1('attempt=', resumeAttempts, resumeDelay);
            client.emit('resume', resumeDelay, resumeAttempts);
            clearTimeout(resumeTimeout), resumeTimeout = null;
            resumeTimeout = setTimeout(function () { return client.connect(); }, resumeDelay);
        }
        client.on('authenticated', function () {
            debug$1('authenticated');
            prevAckAt = thisAckAt || Date.now(), thisAckAt = Date.now();
            client.emit('resume:tick', thisAckAt - prevAckAt, thisAckAt, prevAckAt);
            pingTimeout = setTimeout(function () { return doPing(); }, ping);
            resumeAttempts = 0;
        });
        client.on('disconnected', function (reason) {
            debug$1('disconnected reason=', reason);
            clearTimeout(pingTimeout), pingTimeout = null;
            if (reason === client) {
                debug$1('stop');
                // disconnect was called directly, do not resume, cancel outstanding
                clearTimeout(resumeTimeout), resumeTimeout = null;
                if (resumeAttempts > 0) {
                    client.emit('resume:stop');
                }
                resumeAttempts = 0;
                return;
            }
            if (jitter > 0 && resumeAttempts === 0) {
                var randomized = jitter * Math.random();
                debug$1('jitter first resume attempt=', randomized);
                setTimeout(function () { return doResume(); }, randomized);
            }
            else {
                doResume();
            }
        });
    };
}

function presenceBatch(_a) {
    var _b = (_a === void 0 ? {} : _a).timeout, timeout = _b === void 0 ? 150 : _b;
    return function (client) {
        var batch = [], batchTimeout;
        client.on('presence_change', function (presence) {
            clearTimeout(batchTimeout), batchTimeout = null;
            batch.push(presence);
            batchTimeout = setTimeout(publish, timeout);
        });
        function publish() {
            var data;
            data = batch, batch = [];
            client.emit('presence_change:batch', data);
        }
    };
}

exports.MessageSendError = MessageSendError;
exports.Client = Client;
exports.resume = resume;
exports.presenceBatch = presenceBatch;

Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=ratatoskr.umd.js.map
