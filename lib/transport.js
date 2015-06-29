/// <reference path="../typings/tsd.d.ts" />
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var events_1 = require('events');
(function (TransportStatus) {
    TransportStatus[TransportStatus["Disconnected"] = 0] = "Disconnected";
    TransportStatus[TransportStatus["Connecting"] = 1] = "Connecting";
    TransportStatus[TransportStatus["Connected"] = 2] = "Connected";
    TransportStatus[TransportStatus["Resuming"] = 3] = "Resuming";
})(exports.TransportStatus || (exports.TransportStatus = {}));
var TransportStatus = exports.TransportStatus;
var Transport = (function (_super) {
    __extends(Transport, _super);
    function Transport(props) {
        _super.call(this);
        this.status = TransportStatus.Disconnected;
        this.ping = 30;
        this.timeout = 30;
        var url = props.url, timeout = props.timeout, credentials = props.credentials;
        this.url = url;
        this.timeout = timeout;
        this.credentials = credentials;
    }
    Transport.prototype.connect = function () {
        if (this.socket)
            this.disconnect();
        this.socket = new WebSocket(this.url);
    };
    Transport.prototype.disconnect = function () {
    };
    Transport.prototype.resume = function () {
    };
    return Transport;
})(events_1.EventEmitter);
exports.Transport = Transport;
