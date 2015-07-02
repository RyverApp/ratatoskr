/// <reference path="../typings/tsd.d.ts" />
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var events_1 = require('events');
var defer_1 = require('./defer');
var WebSocket = require('ws');
var shortid = require('shortid');
(function (ConnectionStatus) {
    ConnectionStatus[ConnectionStatus["Disconnected"] = 0] = "Disconnected";
    ConnectionStatus[ConnectionStatus["Connecting"] = 1] = "Connecting";
    ConnectionStatus[ConnectionStatus["Connected"] = 2] = "Connected";
    ConnectionStatus[ConnectionStatus["Authenticated"] = 3] = "Authenticated";
})(exports.ConnectionStatus || (exports.ConnectionStatus = {}));
var ConnectionStatus = exports.ConnectionStatus;
var Client = (function (_super) {
    __extends(Client, _super);
    function Client(_a) {
        var _this = this;
        var endpoint = _a.endpoint, authorization = _a.authorization, _b = _a.timeout, timeout = _b === void 0 ? 5 * 1000 : _b, _c = _a.extensions, extensions = _c === void 0 ? [] : _c;
        _super.call(this);
        this.status = ConnectionStatus.Disconnected;
        this.timeout = 5 * 1000;
        this._needsAck = {};
        this.endpoint = endpoint;
        this.authorization = authorization;
        this.timeout = timeout;
        extensions.forEach(function (ext) { return _this.use(ext); });
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
        if (this.status !== ConnectionStatus.Disconnected) {
            return;
        }
        this.status = ConnectionStatus.Connecting;
        this.emit('connecting');
        var socket = new WebSocket(this.endpoint, ['ratatoskr']);
        socket.onopen = function (evt) {
            _this._wsBind(socket);
        };
        socket.onerror = function (evt) {
            _this.emit('transport:error', evt);
            _this._wsDisconnect(socket, evt);
        };
        socket.onclose = function (evt) {
            _this.emit('transport:close', evt);
            _this._wsDisconnect(socket, evt);
        };
    };
    Client.prototype.disconnect = function () {
        if (this.status === ConnectionStatus.Disconnected) {
            return;
        }
        this._wsDisconnect(this._socket);
    };
    Client.prototype._wsDisconnect = function (socket, reason) {
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
        }
        finally {
            this._socket = null;
        }
        this.status = ConnectionStatus.Disconnected;
        this.emit('disconnected', reason);
    };
    Client.prototype._wsBind = function (socket) {
        var _this = this;
        socket.onopen = null;
        socket.onerror = this._wsError.bind(this);
        socket.onmessage = this._wsMessage.bind(this);
        socket.onclose = this._wsClose.bind(this);
        this._socket = socket;
        this.status = ConnectionStatus.Connected;
        this.emit('connected');
        var auth;
        auth = typeof this.authorization === 'function' ? this.authorization() : this.authorization;
        this._wsSend({ id: this.nextId(), type: 'auth', authorization: auth }).then(function (ack) {
            _this.status = ConnectionStatus.Authenticated;
            _this.emit('authenticated');
        }, function (err) {
            _this.emit('protocol:error', err);
            _this._wsDisconnect(_this._socket, err);
        });
    };
    Client.prototype._wsMessage = function (evt) {
        try {
            this.emit('raw:incomming', evt.data);
            var message = JSON.parse(evt.data);
            if (message.type === 'ack') {
                var id = message.reply_to;
                if (this._needsAck[id]) {
                    this._needsAck[id].deferred.resolve(message);
                }
            }
            else if (message.type) {
                this.emit("protocol:" + message.type, message);
            }
        }
        catch (err) {
            this.emit('protocol:error', err);
        }
    };
    Client.prototype._wsError = function (err) {
        this.emit('transport:error', err);
        this._wsDisconnect(this._socket, err);
    };
    Client.prototype._wsClose = function (evt) {
        this.emit('transport:close', evt);
        this._wsDisconnect(this._socket, evt);
    };
    Client.prototype._wsSend = function (message, timeout) {
        var _this = this;
        if (timeout === void 0) { timeout = this.timeout; }
        if (this.status < ConnectionStatus.Connected) {
            return Promise.reject(new Error('Cannot send data across a socket that is not connected.'));
        }
        var data;
        try {
            data = JSON.stringify(message);
        }
        catch (err) {
            this.emit('protocol:error', err);
            return Promise.reject(err);
        }
        try {
            this.emit('raw:outgoing', data);
            this._socket.send(data);
        }
        catch (err) {
            this.emit('transport:error', err);
            return Promise.reject(err);
        }
        if (message.id) {
            var id = message.id;
            var deferred = defer_1.default();
            var pending = this._needsAck[id] = {
                id: id,
                message: message,
                deferred: deferred,
                timeout: setTimeout(function () { return deferred.reject(new Error('no ack')); }, timeout)
            };
            var cleanup = function () {
                clearTimeout(pending.timeout);
                delete _this._needsAck[id];
            };
            return deferred.promise.then(function (ack) {
                cleanup();
                return ack;
            }, function (err) {
                cleanup();
                throw err;
            });
        }
        else {
            return Promise.resolve();
        }
    };
    Client.prototype.send = function (message) {
        if (this.status < ConnectionStatus.Authenticated) {
            return Promise.reject(new Error('Cannot send data across a socket that is not authenticated.'));
        }
        return this._wsSend(message);
    };
    return Client;
})(events_1.EventEmitter);
exports.Client = Client;
