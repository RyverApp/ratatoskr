/// <reference path="../typings/tsd.d.ts" />
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var events_1 = require('events');
var lang = require('./lang');
var defer_1 = require('./defer');
var WebSocket = require('ws');
(function (ConnectionStatus) {
    ConnectionStatus[ConnectionStatus["Disconnected"] = 0] = "Disconnected";
    ConnectionStatus[ConnectionStatus["Connecting"] = 1] = "Connecting";
    ConnectionStatus[ConnectionStatus["Connected"] = 2] = "Connected";
    ConnectionStatus[ConnectionStatus["Authenticated"] = 3] = "Authenticated";
})(exports.ConnectionStatus || (exports.ConnectionStatus = {}));
var ConnectionStatus = exports.ConnectionStatus;
(function (DisconnectReason) {
    DisconnectReason[DisconnectReason["Consumer"] = 0] = "Consumer";
    DisconnectReason[DisconnectReason["ErrorOnOpen"] = 1] = "ErrorOnOpen";
    DisconnectReason[DisconnectReason["CloseOnOpen"] = 2] = "CloseOnOpen";
})(exports.DisconnectReason || (exports.DisconnectReason = {}));
var DisconnectReason = exports.DisconnectReason;
(function (LogLevel) {
    LogLevel[LogLevel["Error"] = 1] = "Error";
    LogLevel[LogLevel["Info"] = 2] = "Info";
    LogLevel[LogLevel["Debug"] = 3] = "Debug";
})(exports.LogLevel || (exports.LogLevel = {}));
var LogLevel = exports.LogLevel;
var Connection = (function (_super) {
    __extends(Connection, _super);
    function Connection(props) {
        _super.call(this);
        this.status = ConnectionStatus.Disconnected;
        this.ping = 10;
        this.timeoutSend = 5;
        this.timeoutConnect = 15;
        this._needsAck = {};
        this._autoId = 0;
        lang.mixin(this, props);
    }
    Object.defineProperty(Connection.prototype, "_nextId", {
        get: function () {
            return ++this._autoId;
        },
        enumerable: true,
        configurable: true
    });
    Connection.prototype.connect = function () {
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
            _this.disconnect(DisconnectReason.ErrorOnOpen, evt);
        };
        socket.onclose = function (evt) {
            _this.emit('transport:close', evt);
            _this.disconnect(DisconnectReason.CloseOnOpen, evt);
        };
    };
    Connection.prototype.disconnect = function (reason, cause) {
        if (reason === void 0) { reason = DisconnectReason.Consumer; }
        if (this.status === ConnectionStatus.Disconnected) {
            return;
        }
        this.status = ConnectionStatus.Disconnected;
        this._wsDestroy(this.socket), this.socket = null;
        this.emit('disconnected', { reason: reason, cause: cause });
    };
    Connection.prototype._wsDisconnect = function () {
    };
    Connection.prototype._wsDestroy = function (ws) {
        if (ws) {
            ws.onopen = null;
            ws.onerror = null;
            ws.onmessage = null;
            ws.onclose = null;
        }
    };
    Connection.prototype._wsBind = function (ws) {
        try {
            this.socket = ws;
            this.socket.onopen = null;
            this.socket.onerror = this._wsError.bind(this);
            this.socket.onmessage = this._wsMessage.bind(this);
            this.socket.onclose = this._wsClose.bind(this);
            this.emit('connected');
            this.status = ConnectionStatus.Connected;
        }
        catch (err) {
            this.emit('transport:error', err);
            this.disconnect();
        }
    };
    Connection.prototype._wsMessage = function (evt) {
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
                this.emit("" + message.type, message);
            }
        }
        catch (err) {
            this.emit('protocol:error', err);
        }
    };
    Connection.prototype._wsError = function (err) {
        this.emit('transport:error', err);
        this.disconnect();
    };
    Connection.prototype._wsClose = function (evt) {
        this.emit('transport:close', evt);
        this.disconnect();
    };
    Connection.prototype._wsSend = function (message, timeout) {
        var _this = this;
        if (timeout === void 0) { timeout = this.timeoutSend; }
        if (this.status < ConnectionStatus.Connected) {
            return Promise.reject(new Error('Cannot send data across a socket that is not connected.'));
        }
        try {
            var data = JSON.stringify(message);
            this.emit('raw:outgoing', data);
            this.socket.send(data);
        }
        catch (err) {
            this.emit('error', err);
            return Promise.reject(err);
        }
        if (message.id) {
            var id = message.id;
            var deferred = defer_1.default();
            var pending = this._needsAck[id] = {
                id: id,
                message: message,
                deferred: deferred,
                timeout: setTimeout(deferred.reject, this.timeoutSend)
            };
            var remove = function () {
                clearTimeout(pending.timeout);
                delete _this._needsAck[id];
            };
            return deferred.promise.then(remove, remove);
        }
    };
    return Connection;
})(events_1.EventEmitter);
exports.Connection = Connection;
