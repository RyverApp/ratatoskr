"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var events_1 = require("events");
var WebSocket = require("ws");
var shortid = require("shortid");
var debug = require('debug')('ratatoskr:client');
var ConnectionStatus;
(function (ConnectionStatus) {
    ConnectionStatus[ConnectionStatus["Disconnected"] = 0] = "Disconnected";
    ConnectionStatus[ConnectionStatus["Connecting"] = 1] = "Connecting";
    ConnectionStatus[ConnectionStatus["Connected"] = 2] = "Connected";
    ConnectionStatus[ConnectionStatus["Authenticated"] = 3] = "Authenticated";
})(ConnectionStatus = exports.ConnectionStatus || (exports.ConnectionStatus = {}));
var MessageSendErrorCause;
(function (MessageSendErrorCause) {
    MessageSendErrorCause[MessageSendErrorCause["NoConnection"] = 0] = "NoConnection";
    MessageSendErrorCause[MessageSendErrorCause["NoAuth"] = 1] = "NoAuth";
    MessageSendErrorCause[MessageSendErrorCause["NoAck"] = 2] = "NoAck";
    MessageSendErrorCause[MessageSendErrorCause["Serialization"] = 3] = "Serialization";
    MessageSendErrorCause[MessageSendErrorCause["Transport"] = 4] = "Transport";
    MessageSendErrorCause[MessageSendErrorCause["Promise"] = 5] = "Promise";
})(MessageSendErrorCause = exports.MessageSendErrorCause || (exports.MessageSendErrorCause = {}));
var MessageSendError = (function (_super) {
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
exports.MessageSendError = MessageSendError;
var Client = (function (_super) {
    __extends(Client, _super);
    function Client(_a) {
        var _b = _a === void 0 ? {} : _a, endpoint = _b.endpoint, authorization = _b.authorization, _c = _b.timeout, timeout = _c === void 0 ? 5 * 1000 : _c, _d = _b.resource, resource = _d === void 0 ? '' : _d, _e = _b.agent, agent = _e === void 0 ? 'Ratatoskr' : _e, _f = _b.extensions, extensions = _f === void 0 ? [] : _f;
        var _this = _super.call(this) || this;
        _this.status = ConnectionStatus.Disconnected;
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
        if (this.status !== ConnectionStatus.Disconnected) {
            return;
        }
        this.status = ConnectionStatus.Connecting;
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
        }
        finally {
            this._socket = null;
        }
        Object.keys(this._needsAck).forEach(function (k) {
            _this._needsAck[k].error(reason);
        }), this._needsAck = {};
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
            _this.status = ConnectionStatus.Authenticated;
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
        if (this.status < ConnectionStatus.Connected) {
            return Promise.reject(new MessageSendError('Cannot send data across a socket that is not connected.', MessageSendErrorCause.NoAuth));
        }
        debug('send=', message);
        var data;
        try {
            data = JSON.stringify(message);
        }
        catch (err) {
            this.emit('protocol:error', err);
            return Promise.reject(new MessageSendError('Could not serialize message.', MessageSendErrorCause.Serialization, err, message));
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
            return Promise.reject(new MessageSendError('An error occurred in the transport.', MessageSendErrorCause.Transport, err, message));
        }
        if (message.id) {
            var id_1 = message.id;
            var context_1 = this._needsAck[id_1] = { id: id_1 };
            var promise = new Promise(function (ok, err) {
                context_1.ok = ok;
                context_1.error = err;
            });
            var timer_1 = setTimeout(function () {
                debug('ack timeout=', timeout);
                context_1.error(new MessageSendError('Did not receive acknowledgement in the timeout period.', MessageSendErrorCause.NoAck, void 0, message));
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
                throw new MessageSendError('An error occurred during promise resolution', MessageSendErrorCause.Promise, err, message);
            });
        }
        else {
            return Promise.resolve();
        }
    };
    Client.prototype.send = function (message) {
        if (this.status < ConnectionStatus.Authenticated) {
            return Promise.reject(new MessageSendError('Cannot send data across a socket that is not authenticated.', MessageSendErrorCause.NoAuth, void 0, message));
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
    Client.prototype.sendVoiceChange = function (message, ack) {
        if (ack === void 0) { ack = false; }
        message.type = 'voice_change';
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
}(events_1.EventEmitter));
exports.Client = Client;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpZW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL2NsaWVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7QUFBQSxpQ0FBc0M7QUFFdEMsOEJBQWdDO0FBQ2hDLGlDQUFtQztBQUduQyxJQUFNLEtBQUssR0FBb0IsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLGtCQUFrQixDQUFDLENBQUM7QUFFcEUsSUFBWSxnQkFLWDtBQUxELFdBQVksZ0JBQWdCO0lBQ3hCLHVFQUFnQixDQUFBO0lBQ2hCLG1FQUFjLENBQUE7SUFDZCxpRUFBYSxDQUFBO0lBQ2IseUVBQWlCLENBQUE7QUFDckIsQ0FBQyxFQUxXLGdCQUFnQixHQUFoQix3QkFBZ0IsS0FBaEIsd0JBQWdCLFFBSzNCO0FBOEJELElBQVkscUJBT1g7QUFQRCxXQUFZLHFCQUFxQjtJQUM3QixpRkFBZ0IsQ0FBQTtJQUNoQixxRUFBVSxDQUFBO0lBQ1YsbUVBQVMsQ0FBQTtJQUNULG1GQUFpQixDQUFBO0lBQ2pCLDJFQUFhLENBQUE7SUFDYix1RUFBVyxDQUFBO0FBQ2YsQ0FBQyxFQVBXLHFCQUFxQixHQUFyQiw2QkFBcUIsS0FBckIsNkJBQXFCLFFBT2hDO0FBRUQ7SUFBc0Msb0NBQUs7SUFLdkMsMEJBQVksT0FBZSxFQUFFLEtBQTRCLEVBQUUsTUFBWSxFQUFFLElBQWU7UUFBeEYsWUFDSSxrQkFBTSxPQUFPLENBQUMsU0FLakI7UUFIRyxLQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQztRQUNuQixLQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztRQUNyQixLQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQzs7SUFDckIsQ0FBQztJQUNMLHVCQUFDO0FBQUQsQ0FBQyxBQVpELENBQXNDLEtBQUssR0FZMUM7QUFaWSw0Q0FBZ0I7QUFnQjdCO0lBQTRCLDBCQUFZO0lBV3BDLGdCQUFZLEVBQTRIO1lBQTVILDRCQUE0SCxFQUExSCxzQkFBUSxFQUFF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SUFDTCxhQUFDO0FBQUQsQ0FBQyxBQXRTRCxDQUE0QixxQkFBWSxHQXNTdkM7QUF0U1ksd0JBQU0iLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBFdmVudEVtaXR0ZXIgfSBmcm9tICdldmVudHMnO1xyXG5pbXBvcnQgKiBhcyB1cmwgZnJvbSAndXJsJztcclxuaW1wb3J0ICogYXMgV2ViU29ja2V0IGZyb20gJ3dzJztcclxuaW1wb3J0ICogYXMgc2hvcnRpZCBmcm9tICdzaG9ydGlkJztcclxuaW1wb3J0IHsgQWNrLCBFcnJvciwgT3RoZXIsIEF1dGgsIENoYXQsIFByZXNlbmNlQ2hhbmdlLCBVc2VyVHlwaW5nLCBQaW5nLCBUZWFtSm9pbiwgVGVhbUxlYXZlLCBPdXRib3VuZCwgSW5ib3VuZCwgVm9pY2VDaGFuZ2UgfSBmcm9tICcuL2ludGVyZmFjZXMuZCc7XHJcblxyXG5jb25zdCBkZWJ1ZzogZGVidWcuSURlYnVnZ2VyID0gcmVxdWlyZSgnZGVidWcnKSgncmF0YXRvc2tyOmNsaWVudCcpO1xyXG5cclxuZXhwb3J0IGVudW0gQ29ubmVjdGlvblN0YXR1cyB7XHJcbiAgICBEaXNjb25uZWN0ZWQgPSAwLFxyXG4gICAgQ29ubmVjdGluZyA9IDEsXHJcbiAgICBDb25uZWN0ZWQgPSAyLFxyXG4gICAgQXV0aGVudGljYXRlZCA9IDNcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBDb25uZWN0aW9uT3B0aW9ucyB7XHJcbiAgICBlbmRwb2ludD86IHN0cmluZztcclxuICAgIGF1dGhvcml6YXRpb24/OiBzdHJpbmcgfCBBdXRob3JpemF0aW9uRnVuYztcclxuICAgIHJlc291cmNlPzogc3RyaW5nO1xyXG4gICAgYWdlbnQ/OiBzdHJpbmc7XHJcbiAgICB0aW1lb3V0PzogbnVtYmVyO1xyXG4gICAgZXh0ZW5zaW9ucz86IGFueVtdO1xyXG59XHJcblxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBQZW5kaW5nQWNrQ29udGV4dCB7XHJcbiAgICBpZDogc3RyaW5nO1xyXG4gICAgb2s6IChkYXRhOiBhbnkpID0+IHZvaWQ7XHJcbiAgICBlcnJvcjogKGVycjogYW55KSA9PiB2b2lkO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIEF1dGhvcml6YXRpb25GdW5jIHtcclxuICAgICgpOiBzdHJpbmc7XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgRXh0ZW5zaW9uIHtcclxuICAgIGluaXQoY2xpZW50OiBDbGllbnQpO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIEV4dGVuc2lvbkFzRnVuYyB7XHJcbiAgICAoY2xpZW50OiBDbGllbnQpOiB2b2lkO1xyXG59XHJcblxyXG5leHBvcnQgZW51bSBNZXNzYWdlU2VuZEVycm9yQ2F1c2Uge1xyXG4gICAgTm9Db25uZWN0aW9uID0gMCxcclxuICAgIE5vQXV0aCA9IDEsXHJcbiAgICBOb0FjayA9IDIsXHJcbiAgICBTZXJpYWxpemF0aW9uID0gMyxcclxuICAgIFRyYW5zcG9ydCA9IDQsXHJcbiAgICBQcm9taXNlID0gNVxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgTWVzc2FnZVNlbmRFcnJvciBleHRlbmRzIEVycm9yIHtcclxuICAgIGRhdGE6IE91dGJvdW5kO1xyXG4gICAgY2F1c2U6IE1lc3NhZ2VTZW5kRXJyb3JDYXVzZTtcclxuICAgIHNvdXJjZTogYW55O1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKG1lc3NhZ2U6IHN0cmluZywgY2F1c2U6IE1lc3NhZ2VTZW5kRXJyb3JDYXVzZSwgc291cmNlPzogYW55LCBkYXRhPzogT3V0Ym91bmQpIHtcclxuICAgICAgICBzdXBlcihtZXNzYWdlKTtcclxuXHJcbiAgICAgICAgdGhpcy5jYXVzZSA9IGNhdXNlO1xyXG4gICAgICAgIHRoaXMuc291cmNlID0gc291cmNlO1xyXG4gICAgICAgIHRoaXMuZGF0YSA9IGRhdGE7XHJcbiAgICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIENsaWVudCBleHRlbmRzIEV2ZW50RW1pdHRlciB7XHJcbiAgICBzdGF0dXM6IENvbm5lY3Rpb25TdGF0dXMgPSBDb25uZWN0aW9uU3RhdHVzLkRpc2Nvbm5lY3RlZDtcclxuICAgIHJlc291cmNlOiBzdHJpbmc7XHJcbiAgICBhZ2VudDogc3RyaW5nO1xyXG4gICAgZW5kcG9pbnQ6IHN0cmluZztcclxuICAgIGF1dGhvcml6YXRpb246IHN0cmluZyB8IEF1dGhvcml6YXRpb25GdW5jO1xyXG4gICAgdGltZW91dDogbnVtYmVyID0gNSAqIDEwMDA7XHJcblxyXG4gICAgcHJvdGVjdGVkIF9zb2NrZXQ6IFdlYlNvY2tldDtcclxuICAgIHByb3RlY3RlZCBfbmVlZHNBY2s6IHsgW2lkOiBzdHJpbmddOiBQZW5kaW5nQWNrQ29udGV4dCB9ID0ge307XHJcblxyXG4gICAgY29uc3RydWN0b3IoeyBlbmRwb2ludCwgYXV0aG9yaXphdGlvbiwgdGltZW91dCA9IDUgKiAxMDAwLCByZXNvdXJjZSA9ICcnLCBhZ2VudCA9ICdSYXRhdG9za3InLCBleHRlbnNpb25zID0gW10gfTogQ29ubmVjdGlvbk9wdGlvbnMgPSB7fSkge1xyXG4gICAgICAgIHN1cGVyKCk7XHJcblxyXG4gICAgICAgIHRoaXMuYWdlbnQgPSBhZ2VudDtcclxuICAgICAgICB0aGlzLnJlc291cmNlID0gcmVzb3VyY2U7XHJcbiAgICAgICAgdGhpcy5lbmRwb2ludCA9IGVuZHBvaW50O1xyXG4gICAgICAgIHRoaXMuYXV0aG9yaXphdGlvbiA9IGF1dGhvcml6YXRpb247XHJcbiAgICAgICAgdGhpcy50aW1lb3V0ID0gdGltZW91dDtcclxuXHJcbiAgICAgICAgZXh0ZW5zaW9ucy5mb3JFYWNoKChleHQpID0+IHRoaXMudXNlKGV4dCkpO1xyXG4gICAgfVxyXG5cclxuICAgIHVzZShleHQ6IEV4dGVuc2lvbik7XHJcbiAgICB1c2UoZXh0OiBFeHRlbnNpb25Bc0Z1bmMpO1xyXG4gICAgdXNlKGV4dDogYW55KSB7XHJcbiAgICAgICAgaWYgKHR5cGVvZiBleHQucHJvdG90eXBlLmluaXQgPT09ICdmdW5jdGlvbicpIHtcclxuICAgICAgICAgICAgKG5ldyBleHQoKSkuaW5pdCh0aGlzKTtcclxuICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBleHQuaW5pdCA9PT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICAgICAgICBleHQuaW5pdCh0aGlzKTtcclxuICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBleHQgPT09ICdmdW5jdGlvbicpIHtcclxuICAgICAgICAgICAgZXh0KHRoaXMpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBuZXh0SWQoKSB7XHJcbiAgICAgICAgcmV0dXJuIHNob3J0aWQuZ2VuZXJhdGUoKTtcclxuICAgIH1cclxuXHJcbiAgICBjb25uZWN0KCk6IHZvaWQge1xyXG4gICAgICAgIGlmICh0aGlzLnN0YXR1cyAhPT0gQ29ubmVjdGlvblN0YXR1cy5EaXNjb25uZWN0ZWQpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5zdGF0dXMgPSBDb25uZWN0aW9uU3RhdHVzLkNvbm5lY3Rpbmc7XHJcblxyXG4gICAgICAgIGRlYnVnKCdjb25uZWN0IGVuZHBvaW50PScsIHRoaXMuZW5kcG9pbnQpO1xyXG5cclxuICAgICAgICB0aGlzLmVtaXQoJ2Nvbm5lY3RpbmcnKTtcclxuXHJcbiAgICAgICAgdmFyIHNvY2tldCA9IG5ldyBXZWJTb2NrZXQodGhpcy5lbmRwb2ludCwgWydyYXRhdG9za3InXSk7XHJcblxyXG4gICAgICAgIHNvY2tldC5vbm9wZW4gPSAoZXZ0KSA9PiB7XHJcbiAgICAgICAgICAgIGRlYnVnKCdjb25uZWN0IG9ub3Blbj0nLCBldnQpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5fd3NCaW5kKHNvY2tldCk7XHJcbiAgICAgICAgfTtcclxuICAgICAgICBzb2NrZXQub25lcnJvciA9IChldnQpID0+IHtcclxuICAgICAgICAgICAgZGVidWcoJ2Nvbm5lY3Qgb25lcnJvcj0nLCBldnQpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5lbWl0KCd0cmFuc3BvcnQ6ZXJyb3InLCBldnQpO1xyXG4gICAgICAgICAgICB0aGlzLl93c0Rpc2Nvbm5lY3Qoc29ja2V0LCBldnQpO1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgc29ja2V0Lm9uY2xvc2UgPSAoZXZ0KSA9PiB7XHJcbiAgICAgICAgICAgIGRlYnVnKCdjb25uZWN0IG9uY2xvc2U9JywgZXZ0KTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuZW1pdCgndHJhbnNwb3J0OmNsb3NlJywgZXZ0KTtcclxuICAgICAgICAgICAgdGhpcy5fd3NEaXNjb25uZWN0KHNvY2tldCwgZXZ0KTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZGlzY29ubmVjdChyZWFzb246IGFueSA9IHRoaXMpOiB2b2lkIHtcclxuICAgICAgICB0aGlzLl93c0Rpc2Nvbm5lY3QodGhpcy5fc29ja2V0LCByZWFzb24pO1xyXG4gICAgfVxyXG5cclxuICAgIHByb3RlY3RlZCBfd3NEaXNjb25uZWN0KHNvY2tldDogV2ViU29ja2V0LCByZWFzb24/OiBhbnkpOiB2b2lkIHtcclxuICAgICAgICBkZWJ1ZygnZGlzY29ubmVjdCByZWFzb249JywgcmVhc29uKTtcclxuXHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgaWYgKHNvY2tldCkge1xyXG4gICAgICAgICAgICAgICAgc29ja2V0Lm9ub3BlbiA9IG51bGw7XHJcbiAgICAgICAgICAgICAgICBzb2NrZXQub25lcnJvciA9IG51bGw7XHJcbiAgICAgICAgICAgICAgICBzb2NrZXQub25tZXNzYWdlID0gbnVsbDtcclxuICAgICAgICAgICAgICAgIHNvY2tldC5vbmNsb3NlID0gbnVsbDtcclxuICAgICAgICAgICAgICAgIHNvY2tldC5jbG9zZSgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyKSB7XHJcbiAgICAgICAgICAgIC8vIG5vdGhpbmcgdG8gZG8gaGVyZSwgd2UgYXJlIHJlbGVhc2luZyB0aGUgc29ja2V0XHJcbiAgICAgICAgfSBmaW5hbGx5IHtcclxuICAgICAgICAgICAgdGhpcy5fc29ja2V0ID0gbnVsbDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIE9iamVjdC5rZXlzKHRoaXMuX25lZWRzQWNrKS5mb3JFYWNoKChrKSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMuX25lZWRzQWNrW2tdLmVycm9yKHJlYXNvbik7XHJcbiAgICAgICAgfSksIHRoaXMuX25lZWRzQWNrID0ge307XHJcblxyXG4gICAgICAgIHRoaXMuc3RhdHVzID0gQ29ubmVjdGlvblN0YXR1cy5EaXNjb25uZWN0ZWQ7XHJcblxyXG4gICAgICAgIHRoaXMuZW1pdCgnZGlzY29ubmVjdGVkJywgcmVhc29uKTtcclxuICAgIH1cclxuXHJcbiAgICBwcm90ZWN0ZWQgX3dzQmluZChzb2NrZXQ6IFdlYlNvY2tldCk6IHZvaWQge1xyXG4gICAgICAgIHNvY2tldC5vbm9wZW4gPSBudWxsO1xyXG4gICAgICAgIHNvY2tldC5vbmVycm9yID0gdGhpcy5fd3NFcnJvci5iaW5kKHRoaXMpO1xyXG4gICAgICAgIHNvY2tldC5vbm1lc3NhZ2UgPSB0aGlzLl93c01lc3NhZ2UuYmluZCh0aGlzKTtcclxuICAgICAgICBzb2NrZXQub25jbG9zZSA9IHRoaXMuX3dzQ2xvc2UuYmluZCh0aGlzKTtcclxuXHJcbiAgICAgICAgdGhpcy5fc29ja2V0ID0gc29ja2V0O1xyXG5cclxuICAgICAgICB0aGlzLnN0YXR1cyA9IENvbm5lY3Rpb25TdGF0dXMuQ29ubmVjdGVkO1xyXG5cclxuICAgICAgICB0aGlzLmVtaXQoJ2Nvbm5lY3RlZCcpO1xyXG5cclxuICAgICAgICB2YXIgYXV0aDogc3RyaW5nO1xyXG5cclxuICAgICAgICBhdXRoID0gdHlwZW9mIHRoaXMuYXV0aG9yaXphdGlvbiA9PT0gJ2Z1bmN0aW9uJyA/ICg8QXV0aG9yaXphdGlvbkZ1bmM+dGhpcy5hdXRob3JpemF0aW9uKSgpIDogPHN0cmluZz50aGlzLmF1dGhvcml6YXRpb247XHJcblxyXG4gICAgICAgIHZhciBtZXNzYWdlID0gPEF1dGg+e1xyXG4gICAgICAgICAgICBpZDogdGhpcy5uZXh0SWQoKSxcclxuICAgICAgICAgICAgdHlwZTogJ2F1dGgnLFxyXG4gICAgICAgICAgICBhdXRob3JpemF0aW9uOiBhdXRoXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgaWYgKHRoaXMuYWdlbnQpIG1lc3NhZ2UuYWdlbnQgPSB0aGlzLmFnZW50O1xyXG4gICAgICAgIGlmICh0aGlzLnJlc291cmNlKSBtZXNzYWdlLnJlc291cmNlID0gdGhpcy5yZXNvdXJjZTtcclxuXHJcbiAgICAgICAgdGhpcy5fd3NTZW5kKG1lc3NhZ2UpLnRoZW4oKGFjaykgPT4ge1xyXG4gICAgICAgICAgICBkZWJ1ZygnYXV0aGVudGljYXRpb24gYWNrPScsIGFjayk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLnN0YXR1cyA9IENvbm5lY3Rpb25TdGF0dXMuQXV0aGVudGljYXRlZDtcclxuICAgICAgICAgICAgdGhpcy5lbWl0KCdhdXRoZW50aWNhdGVkJywgYWNrKTtcclxuICAgICAgICB9LCAoZXJyKSA9PiB7XHJcbiAgICAgICAgICAgIGRlYnVnKCdhdXRoZW50aWNhdGlvbiBlcnJvcj0nLCBlcnIpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5lbWl0KCdwcm90b2NvbDplcnJvcicsIGVycik7XHJcbiAgICAgICAgICAgIHRoaXMuX3dzRGlzY29ubmVjdCh0aGlzLl9zb2NrZXQsIGVycik7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgcHJvdGVjdGVkIF93c0luYm91bmRFcnJvcihtZXNzYWdlOiBFcnJvcikge1xyXG4gICAgICAgIGlmIChtZXNzYWdlLmNvZGUgPT09ICdhdXRoX2ZhaWxlZCcpIHtcclxuICAgICAgICAgICAgZGVidWcoJ2F1dGhlbnRpY2F0aW9uIGZhaWx1cmU9JywgbWVzc2FnZSk7XHJcbiAgICAgICAgICAgIHRoaXMuX3dzRGlzY29ubmVjdCh0aGlzLl9zb2NrZXQsIG1lc3NhZ2UpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRoaXMuZW1pdCgncHJvdG9jb2w6ZXJyb3InLCBtZXNzYWdlKTtcclxuICAgICAgICAgICAgY29uc3QgYWNrID0gdGhpcy5fbmVlZHNBY2tbbWVzc2FnZS5pZF07XHJcbiAgICAgICAgICAgIGlmIChhY2spIHtcclxuICAgICAgICAgICAgICAgIGFjay5lcnJvcihtZXNzYWdlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcm90ZWN0ZWQgX3dzSW5ib3VuZEFjayhtZXNzYWdlOiBBY2spIHtcclxuICAgICAgICBjb25zdCBhY2sgPSB0aGlzLl9uZWVkc0Fja1ttZXNzYWdlLnJlcGx5X3RvXTtcclxuICAgICAgICBpZiAoYWNrKSB7XHJcbiAgICAgICAgICAgIG1lc3NhZ2UuZXJyb3IgPyBhY2suZXJyb3IobWVzc2FnZS5lcnJvcikgOiBhY2sub2sobWVzc2FnZSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByb3RlY3RlZCBfd3NJbmJvdW5kT3RoZXIobWVzc2FnZTogT3RoZXIpIHtcclxuICAgICAgICB0aGlzLmVtaXQoYCR7bWVzc2FnZS50eXBlfWAsIG1lc3NhZ2UpO1xyXG4gICAgfVxyXG5cclxuICAgIHByb3RlY3RlZCBfd3NNZXNzYWdlKGV2dCkge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIHRoaXMuZW1pdCgncmF3OmluY29tbWluZycsIGV2dC5kYXRhKTtcclxuICAgICAgICAgICAgY29uc3QgbWVzc2FnZSA9IDxJbmJvdW5kPkpTT04ucGFyc2UoZXZ0LmRhdGEpO1xyXG4gICAgICAgICAgICBkZWJ1ZygncmVjZWl2ZT0nLCBtZXNzYWdlKTtcclxuICAgICAgICAgICAgaWYgKG1lc3NhZ2UudHlwZSA9PT0gJ2Vycm9yJykge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5fd3NJbmJvdW5kRXJyb3IoPEVycm9yPm1lc3NhZ2UpO1xyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKG1lc3NhZ2UudHlwZSA9PT0gJ2FjaycpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuX3dzSW5ib3VuZEFjayg8QWNrPm1lc3NhZ2UpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5fd3NJbmJvdW5kT3RoZXIoPE90aGVyPm1lc3NhZ2UpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyKSB7XHJcbiAgICAgICAgICAgIHRoaXMuZW1pdCgncHJvdG9jb2w6ZXJyb3InLCBlcnIpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcm90ZWN0ZWQgX3dzRXJyb3IoZXZ0KSB7XHJcbiAgICAgICAgdGhpcy5lbWl0KCd0cmFuc3BvcnQ6ZXJyb3InLCBldnQpO1xyXG4gICAgICAgIHRoaXMuX3dzRGlzY29ubmVjdCh0aGlzLl9zb2NrZXQsIGV2dCk7XHJcbiAgICB9XHJcblxyXG4gICAgcHJvdGVjdGVkIF93c0Nsb3NlKGV2dCkge1xyXG4gICAgICAgIHRoaXMuZW1pdCgndHJhbnNwb3J0OmNsb3NlJywgZXZ0KTtcclxuICAgICAgICB0aGlzLl93c0Rpc2Nvbm5lY3QodGhpcy5fc29ja2V0LCBldnQpO1xyXG4gICAgfVxyXG5cclxuICAgIHByb3RlY3RlZCBfd3NTZW5kKG1lc3NhZ2U6IE91dGJvdW5kLCB0aW1lb3V0OiBudW1iZXIgPSB0aGlzLnRpbWVvdXQpOiBQcm9taXNlPEFjaz4ge1xyXG4gICAgICAgIGlmICh0aGlzLnN0YXR1cyA8IENvbm5lY3Rpb25TdGF0dXMuQ29ubmVjdGVkKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChuZXcgTWVzc2FnZVNlbmRFcnJvcignQ2Fubm90IHNlbmQgZGF0YSBhY3Jvc3MgYSBzb2NrZXQgdGhhdCBpcyBub3QgY29ubmVjdGVkLicsIE1lc3NhZ2VTZW5kRXJyb3JDYXVzZS5Ob0F1dGgpKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGRlYnVnKCdzZW5kPScsIG1lc3NhZ2UpO1xyXG5cclxuICAgICAgICB2YXIgZGF0YTtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBkYXRhID0gSlNPTi5zdHJpbmdpZnkobWVzc2FnZSk7XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyKSB7XHJcbiAgICAgICAgICAgIHRoaXMuZW1pdCgncHJvdG9jb2w6ZXJyb3InLCBlcnIpO1xyXG4gICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QobmV3IE1lc3NhZ2VTZW5kRXJyb3IoJ0NvdWxkIG5vdCBzZXJpYWxpemUgbWVzc2FnZS4nLCBNZXNzYWdlU2VuZEVycm9yQ2F1c2UuU2VyaWFsaXphdGlvbiwgZXJyLCBtZXNzYWdlKSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmVtaXQoJ3JhdzpvdXRnb2luZycsIGRhdGEpO1xyXG5cclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCBzb2NrZXQgPSB0aGlzLl9zb2NrZXQ7XHJcbiAgICAgICAgICAgIHNvY2tldC5zZW5kKGRhdGEpO1xyXG4gICAgICAgICAgICBpZiAoc29ja2V0ICE9PSB0aGlzLl9zb2NrZXQpIHtcclxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignU29ja2V0IHdhcyBkZXN0cm95ZWQgZHVyaW5nIHNlbmQuJyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IGNhdGNoIChlcnIpIHtcclxuICAgICAgICAgICAgZGVidWcoJ3NlbmQgZXJyPScsIGVycik7XHJcbiAgICAgICAgICAgIHRoaXMuZW1pdCgndHJhbnNwb3J0OmVycm9yJywgZXJyKTtcclxuICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KG5ldyBNZXNzYWdlU2VuZEVycm9yKCdBbiBlcnJvciBvY2N1cnJlZCBpbiB0aGUgdHJhbnNwb3J0LicsIE1lc3NhZ2VTZW5kRXJyb3JDYXVzZS5UcmFuc3BvcnQsIGVyciwgbWVzc2FnZSkpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKG1lc3NhZ2UuaWQpIHtcclxuICAgICAgICAgICAgY29uc3QgaWQgPSBtZXNzYWdlLmlkO1xyXG4gICAgICAgICAgICBjb25zdCBjb250ZXh0ID0gdGhpcy5fbmVlZHNBY2tbaWRdID0gPFBlbmRpbmdBY2tDb250ZXh0PnsgaWQ6IGlkIH07XHJcbiAgICAgICAgICAgIGNvbnN0IHByb21pc2UgPSBuZXcgUHJvbWlzZSgob2ssIGVycikgPT4ge1xyXG4gICAgICAgICAgICAgICAgY29udGV4dC5vayA9IG9rO1xyXG4gICAgICAgICAgICAgICAgY29udGV4dC5lcnJvciA9IGVycjtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIGNvbnN0IHRpbWVyID0gc2V0VGltZW91dCgoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBkZWJ1ZygnYWNrIHRpbWVvdXQ9JywgdGltZW91dCk7XHJcbiAgICAgICAgICAgICAgICBjb250ZXh0LmVycm9yKG5ldyBNZXNzYWdlU2VuZEVycm9yKCdEaWQgbm90IHJlY2VpdmUgYWNrbm93bGVkZ2VtZW50IGluIHRoZSB0aW1lb3V0IHBlcmlvZC4nLCBNZXNzYWdlU2VuZEVycm9yQ2F1c2UuTm9BY2ssIHZvaWQgMCwgbWVzc2FnZSkpXHJcbiAgICAgICAgICAgIH0sIHRpbWVvdXQpO1xyXG4gICAgICAgICAgICBjb25zdCBjbGVhbnVwID0gKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVyKTtcclxuICAgICAgICAgICAgICAgIGRlbGV0ZSB0aGlzLl9uZWVkc0Fja1tpZF07XHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIHJldHVybiBwcm9taXNlLnRoZW4oKGFjazogQWNrKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBkZWJ1ZygnYWNrPScsIGFjayk7XHJcbiAgICAgICAgICAgICAgICBjbGVhbnVwKCk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gYWNrO1xyXG4gICAgICAgICAgICB9LCAoZXJyKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBkZWJ1ZygnYWNrIGVycm9yPScsIGVycik7XHJcbiAgICAgICAgICAgICAgICBjbGVhbnVwKCk7XHJcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgTWVzc2FnZVNlbmRFcnJvcignQW4gZXJyb3Igb2NjdXJyZWQgZHVyaW5nIHByb21pc2UgcmVzb2x1dGlvbicsIE1lc3NhZ2VTZW5kRXJyb3JDYXVzZS5Qcm9taXNlLCBlcnIsIG1lc3NhZ2UpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHNlbmQobWVzc2FnZTogT3V0Ym91bmQpOiBQcm9taXNlPEFjaz4ge1xyXG4gICAgICAgIGlmICh0aGlzLnN0YXR1cyA8IENvbm5lY3Rpb25TdGF0dXMuQXV0aGVudGljYXRlZCkge1xyXG4gICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QobmV3IE1lc3NhZ2VTZW5kRXJyb3IoJ0Nhbm5vdCBzZW5kIGRhdGEgYWNyb3NzIGEgc29ja2V0IHRoYXQgaXMgbm90IGF1dGhlbnRpY2F0ZWQuJywgTWVzc2FnZVNlbmRFcnJvckNhdXNlLk5vQXV0aCwgdm9pZCAwLCBtZXNzYWdlKSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiB0aGlzLl93c1NlbmQobWVzc2FnZSk7XHJcbiAgICB9XHJcblxyXG4gICAgX2Vuc3VyZUNhbkFjayhhY2s6IGJvb2xlYW4sIG1lc3NhZ2U6IE91dGJvdW5kKTogT3V0Ym91bmQge1xyXG4gICAgICAgIGlmIChhY2sgJiYgISgnaWQnIGluIG1lc3NhZ2UpKSB7IG1lc3NhZ2UuaWQgPSB0aGlzLm5leHRJZCgpOyB9XHJcbiAgICAgICAgcmV0dXJuIG1lc3NhZ2U7XHJcbiAgICB9XHJcblxyXG4gICAgc2VuZFBpbmcobWVzc2FnZTogUGluZyA9IDxQaW5nPnt9LCBhY2s6IGJvb2xlYW4gPSB0cnVlKTogUHJvbWlzZTxBY2s+IHtcclxuICAgICAgICBtZXNzYWdlLnR5cGUgPSAncGluZyc7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuc2VuZCh0aGlzLl9lbnN1cmVDYW5BY2soYWNrLCBtZXNzYWdlKSk7XHJcbiAgICB9XHJcblxyXG4gICAgc2VuZENoYXQobWVzc2FnZTogQ2hhdCwgYWNrOiBib29sZWFuID0gdHJ1ZSk6IFByb21pc2U8QWNrPiB7XHJcbiAgICAgICAgbWVzc2FnZS50eXBlID0gJ2NoYXQnO1xyXG4gICAgICAgIHJldHVybiB0aGlzLnNlbmQodGhpcy5fZW5zdXJlQ2FuQWNrKGFjaywgbWVzc2FnZSkpO1xyXG4gICAgfVxyXG5cclxuICAgIHNlbmRQcmVzZW5jZUNoYW5nZShtZXNzYWdlOiBQcmVzZW5jZUNoYW5nZSwgYWNrOiBib29sZWFuID0gZmFsc2UpOiBQcm9taXNlPEFjaz4ge1xyXG4gICAgICAgIG1lc3NhZ2UudHlwZSA9ICdwcmVzZW5jZV9jaGFuZ2UnO1xyXG4gICAgICAgIHJldHVybiB0aGlzLnNlbmQodGhpcy5fZW5zdXJlQ2FuQWNrKGFjaywgbWVzc2FnZSkpO1xyXG4gICAgfVxyXG5cclxuICAgIHNlbmRWb2ljZUNoYW5nZShtZXNzYWdlOiBWb2ljZUNoYW5nZSwgYWNrOiBib29sZWFuID0gZmFsc2UpOiBQcm9taXNlPEFjaz4ge1xyXG4gICAgICAgIG1lc3NhZ2UudHlwZSA9ICd2b2ljZV9jaGFuZ2UnO1xyXG4gICAgICAgIHJldHVybiB0aGlzLnNlbmQodGhpcy5fZW5zdXJlQ2FuQWNrKGFjaywgbWVzc2FnZSkpO1xyXG4gICAgfVxyXG5cclxuICAgIHNlbmRVc2VyVHlwaW5nKG1lc3NhZ2U6IFVzZXJUeXBpbmcsIGFjazogYm9vbGVhbiA9IGZhbHNlKTogUHJvbWlzZTxBY2s+IHtcclxuICAgICAgICBtZXNzYWdlLnR5cGUgPSAndXNlcl90eXBpbmcnO1xyXG4gICAgICAgIHJldHVybiB0aGlzLnNlbmQodGhpcy5fZW5zdXJlQ2FuQWNrKGFjaywgbWVzc2FnZSkpO1xyXG4gICAgfVxyXG5cclxuICAgIHNlbmRUZWFtSm9pbihtZXNzYWdlOiBUZWFtSm9pbiwgYWNrOiBib29sZWFuID0gZmFsc2UpOiBQcm9taXNlPEFjaz4ge1xyXG4gICAgICAgIG1lc3NhZ2UudHlwZSA9ICd0ZWFtX2pvaW4nO1xyXG4gICAgICAgIHJldHVybiB0aGlzLnNlbmQodGhpcy5fZW5zdXJlQ2FuQWNrKGFjaywgbWVzc2FnZSkpO1xyXG4gICAgfVxyXG5cclxuICAgIHNlbmRUZWFtTGVhdmUobWVzc2FnZTogVGVhbUxlYXZlLCBhY2s6IGJvb2xlYW4gPSBmYWxzZSk6IFByb21pc2U8QWNrPiB7XHJcbiAgICAgICAgbWVzc2FnZS50eXBlID0gJ3RlYW1fbGVhdmUnO1xyXG4gICAgICAgIHJldHVybiB0aGlzLnNlbmQodGhpcy5fZW5zdXJlQ2FuQWNrKGFjaywgbWVzc2FnZSkpO1xyXG4gICAgfVxyXG59XHJcbiJdfQ==