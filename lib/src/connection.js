/// <reference path="../typings/tsd.d.ts" />
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var events_1 = require('events');
var url = require('url');
var lang = require('./lang');
(function (ConnectionStatus) {
    ConnectionStatus[ConnectionStatus["Disconnected"] = 0] = "Disconnected";
    ConnectionStatus[ConnectionStatus["Connecting"] = 1] = "Connecting";
    ConnectionStatus[ConnectionStatus["Connected"] = 2] = "Connected";
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
        this.timeoutSend = 30;
        this.timeoutConnect = 15;
        lang.mixin(this, props);
    }
    Connection.prototype.connect = function () {
        var _this = this;
        if (this.status !== ConnectionStatus.Disconnected) {
            return;
        }
        this.status = ConnectionStatus.Connecting;
        this.emit('connecting');
        var socket = new WebSocket(this._wsEndpoint, ['ratatoskr']);
        socket.onopen = function (evt) {
            _this._wsBindToSocket(socket);
        };
        socket.onerror = function (evt) {
            _this._wsDestroySocket(socket);
            _this.emit('disconnected', { reason: DisconnectReason.ErrorOnOpen });
        };
    };
    Object.defineProperty(Connection.prototype, "_wsEndpoint", {
        get: function () {
            var parsed = url.parse(this.endpoint);
            return url.format(lang.mixin(parsed, {
                query: lang.mixin(parsed.query, {
                    sessionId: this._wsSessionId
                })
            }));
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Connection.prototype, "_wsSessionId", {
        get: function () {
            var cred = this.credentials;
            return cred && cred.sessionId || '';
        },
        enumerable: true,
        configurable: true
    });
    Connection.prototype._wsDestroySocket = function (ws) {
        if (ws) {
            ws.onopen = null;
            ws.onerror = null;
            ws.onmessage = null;
            ws.onclose = null;
        }
    };
    Connection.prototype._wsBindToSocket = function (socket) {
        try {
            this.socket = socket;
            this._protoGreet();
        }
        catch (err) {
        }
    };
    Connection.prototype._protoGreet = function () {
    };
    return Connection;
})(events_1.EventEmitter);
exports.Connection = Connection;
