/// <reference path="../typings/tsd.d.ts" />
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var events_1 = require('events');
var lang = require('./lang');
var es6_promise_1 = require('es6-promise');
(function (TransportStatus) {
    TransportStatus[TransportStatus["Disconnected"] = 0] = "Disconnected";
    TransportStatus[TransportStatus["Connecting"] = 1] = "Connecting";
    TransportStatus[TransportStatus["Connected"] = 2] = "Connected";
})(exports.TransportStatus || (exports.TransportStatus = {}));
var TransportStatus = exports.TransportStatus;
function destroyWs(socket) {
    try {
        socket.onopen = null;
        socket.onerror = null;
        socket.onmessage = null;
        socket.onclose = null;
        socket.close();
    }
    catch (err) { }
    return null;
}
var Transport = (function (_super) {
    __extends(Transport, _super);
    function Transport(props) {
        _super.call(this);
        this.status = TransportStatus.Disconnected;
        this.ping = 30;
        this.timeoutSend = 30;
        this.timeoutConnect = 15;
        lang.mixin(this, props);
    }
    Transport.prototype.connect = function () {
        var _this = this;
        if (this.status !== TransportStatus.Disconnected)
            this.disconnect();
        this.status = TransportStatus.Connecting;
        return new es6_promise_1.Promise(function (resolve, reject) {
            var socket = new WebSocket(_this.url, ['xmpp']);
            socket.onopen = function () {
                resolve(_this._bindToSocket(socket));
            };
            socket.onerror = socket.onclose = function (err) {
                socket.onerror = socket.onclose = null;
                reject(err);
            };
        });
    };
    Transport.prototype._bindToSocket = function (socket) {
        return new es6_promise_1.Promise(function (resolve, reject) {
        });
    };
    Transport.prototype.disconnect = function (reason) {
        if (this.status === TransportStatus.Disconnected)
            return;
        this.status = TransportStatus.Disconnected;
        this.socket = destroyWs(this.socket);
        this.emit('disconnected', { reason: reason || "none" });
    };
    Transport.prototype._wsError = function (evt) {
    };
    Transport.prototype._wsMessage = function (evt) {
    };
    Transport.prototype._wsClose = function (evt) {
    };
    return Transport;
})(events_1.EventEmitter);
exports.Transport = Transport;
