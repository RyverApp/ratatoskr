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
            return Promise.resolve({ type: 'ack', reply_to: 'success', reply_type: message.type });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpZW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL2NsaWVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7QUFBQSxpQ0FBc0M7QUFFdEMsOEJBQWdDO0FBQ2hDLGlDQUFtQztBQUduQyxJQUFNLEtBQUssR0FBb0IsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLGtCQUFrQixDQUFDLENBQUM7QUFFcEUsSUFBWSxnQkFLWDtBQUxELFdBQVksZ0JBQWdCO0lBQ3hCLHVFQUFnQixDQUFBO0lBQ2hCLG1FQUFjLENBQUE7SUFDZCxpRUFBYSxDQUFBO0lBQ2IseUVBQWlCLENBQUE7QUFDckIsQ0FBQyxFQUxXLGdCQUFnQixHQUFoQix3QkFBZ0IsS0FBaEIsd0JBQWdCLFFBSzNCO0FBNkJELElBQVkscUJBT1g7QUFQRCxXQUFZLHFCQUFxQjtJQUM3QixpRkFBZ0IsQ0FBQTtJQUNoQixxRUFBVSxDQUFBO0lBQ1YsbUVBQVMsQ0FBQTtJQUNULG1GQUFpQixDQUFBO0lBQ2pCLDJFQUFhLENBQUE7SUFDYix1RUFBVyxDQUFBO0FBQ2YsQ0FBQyxFQVBXLHFCQUFxQixHQUFyQiw2QkFBcUIsS0FBckIsNkJBQXFCLFFBT2hDO0FBRUQ7SUFBc0Msb0NBQUs7SUFLdkMsMEJBQVksT0FBZSxFQUFFLEtBQTRCLEVBQUUsTUFBWSxFQUFFLElBQWU7UUFBeEYsWUFDSSxrQkFBTSxPQUFPLENBQUMsU0FLakI7UUFIRyxLQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQztRQUNuQixLQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztRQUNyQixLQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQzs7SUFDckIsQ0FBQztJQUNMLHVCQUFDO0FBQUQsQ0FBQyxBQVpELENBQXNDLEtBQUssR0FZMUM7QUFaWSw0Q0FBZ0I7QUFjN0I7SUFBNEIsMEJBQVk7SUFXcEMsZ0JBQVksRUFBNEg7WUFBNUgsNEJBQTRILEVBQTFILHNCQUFRLEVBQUUs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QUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQztJQUN2RCxDQUFDO0lBQ0wsYUFBQztBQUFELENBQUMsQUF0U0QsQ0FBNEIscUJBQVksR0FzU3ZDO0FBdFNZLHdCQUFNIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgRXZlbnRFbWl0dGVyIH0gZnJvbSAnZXZlbnRzJztcclxuaW1wb3J0ICogYXMgdXJsIGZyb20gJ3VybCc7XHJcbmltcG9ydCAqIGFzIFdlYlNvY2tldCBmcm9tICd3cyc7XHJcbmltcG9ydCAqIGFzIHNob3J0aWQgZnJvbSAnc2hvcnRpZCc7XHJcbmltcG9ydCB7IEFjaywgRXJyb3IsIE90aGVyLCBBdXRoLCBDaGF0LCBQcmVzZW5jZUNoYW5nZSwgVXNlclR5cGluZywgUGluZywgVGVhbUpvaW4sIFRlYW1MZWF2ZSwgT3V0Ym91bmQsIEluYm91bmQsIFZvaWNlQ2hhbmdlIH0gZnJvbSAnLi9pbnRlcmZhY2VzJztcclxuXHJcbmNvbnN0IGRlYnVnOiBkZWJ1Zy5JRGVidWdnZXIgPSByZXF1aXJlKCdkZWJ1ZycpKCdyYXRhdG9za3I6Y2xpZW50Jyk7XHJcblxyXG5leHBvcnQgZW51bSBDb25uZWN0aW9uU3RhdHVzIHtcclxuICAgIERpc2Nvbm5lY3RlZCA9IDAsXHJcbiAgICBDb25uZWN0aW5nID0gMSxcclxuICAgIENvbm5lY3RlZCA9IDIsXHJcbiAgICBBdXRoZW50aWNhdGVkID0gM1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIENvbm5lY3Rpb25PcHRpb25zIHtcclxuICAgIGVuZHBvaW50Pzogc3RyaW5nO1xyXG4gICAgYXV0aG9yaXphdGlvbj86IHN0cmluZyB8IEF1dGhvcml6YXRpb25GdW5jO1xyXG4gICAgcmVzb3VyY2U/OiBzdHJpbmc7XHJcbiAgICBhZ2VudD86IHN0cmluZztcclxuICAgIHRpbWVvdXQ/OiBudW1iZXI7XHJcbiAgICBleHRlbnNpb25zPzogYW55W107XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgUGVuZGluZ0Fja0NvbnRleHQge1xyXG4gICAgaWQ6IHN0cmluZztcclxuICAgIG9rOiAoZGF0YTogYW55KSA9PiB2b2lkO1xyXG4gICAgZXJyb3I6IChlcnI6IGFueSkgPT4gdm9pZDtcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBBdXRob3JpemF0aW9uRnVuYyB7XHJcbiAgICAoKTogc3RyaW5nO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIEV4dGVuc2lvbiB7XHJcbiAgICBpbml0KGNsaWVudDogQ2xpZW50KTtcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBFeHRlbnNpb25Bc0Z1bmMge1xyXG4gICAgKGNsaWVudDogQ2xpZW50KTogdm9pZDtcclxufVxyXG5cclxuZXhwb3J0IGVudW0gTWVzc2FnZVNlbmRFcnJvckNhdXNlIHtcclxuICAgIE5vQ29ubmVjdGlvbiA9IDAsXHJcbiAgICBOb0F1dGggPSAxLFxyXG4gICAgTm9BY2sgPSAyLFxyXG4gICAgU2VyaWFsaXphdGlvbiA9IDMsXHJcbiAgICBUcmFuc3BvcnQgPSA0LFxyXG4gICAgUHJvbWlzZSA9IDVcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIE1lc3NhZ2VTZW5kRXJyb3IgZXh0ZW5kcyBFcnJvciB7XHJcbiAgICBkYXRhOiBPdXRib3VuZDtcclxuICAgIGNhdXNlOiBNZXNzYWdlU2VuZEVycm9yQ2F1c2U7XHJcbiAgICBzb3VyY2U6IGFueTtcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihtZXNzYWdlOiBzdHJpbmcsIGNhdXNlOiBNZXNzYWdlU2VuZEVycm9yQ2F1c2UsIHNvdXJjZT86IGFueSwgZGF0YT86IE91dGJvdW5kKSB7XHJcbiAgICAgICAgc3VwZXIobWVzc2FnZSk7XHJcblxyXG4gICAgICAgIHRoaXMuY2F1c2UgPSBjYXVzZTtcclxuICAgICAgICB0aGlzLnNvdXJjZSA9IHNvdXJjZTtcclxuICAgICAgICB0aGlzLmRhdGEgPSBkYXRhO1xyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgQ2xpZW50IGV4dGVuZHMgRXZlbnRFbWl0dGVyIHtcclxuICAgIHN0YXR1czogQ29ubmVjdGlvblN0YXR1cyA9IENvbm5lY3Rpb25TdGF0dXMuRGlzY29ubmVjdGVkO1xyXG4gICAgcmVzb3VyY2U6IHN0cmluZztcclxuICAgIGFnZW50OiBzdHJpbmc7XHJcbiAgICBlbmRwb2ludDogc3RyaW5nO1xyXG4gICAgYXV0aG9yaXphdGlvbjogc3RyaW5nIHwgQXV0aG9yaXphdGlvbkZ1bmM7XHJcbiAgICB0aW1lb3V0OiBudW1iZXIgPSA1ICogMTAwMDtcclxuXHJcbiAgICBwcm90ZWN0ZWQgX3NvY2tldDogV2ViU29ja2V0O1xyXG4gICAgcHJvdGVjdGVkIF9uZWVkc0FjazogeyBbaWQ6IHN0cmluZ106IFBlbmRpbmdBY2tDb250ZXh0IH0gPSB7fTtcclxuXHJcbiAgICBjb25zdHJ1Y3Rvcih7IGVuZHBvaW50LCBhdXRob3JpemF0aW9uLCB0aW1lb3V0ID0gNSAqIDEwMDAsIHJlc291cmNlID0gJycsIGFnZW50ID0gJ1JhdGF0b3NrcicsIGV4dGVuc2lvbnMgPSBbXSB9OiBDb25uZWN0aW9uT3B0aW9ucyA9IHt9KSB7XHJcbiAgICAgICAgc3VwZXIoKTtcclxuXHJcbiAgICAgICAgdGhpcy5hZ2VudCA9IGFnZW50O1xyXG4gICAgICAgIHRoaXMucmVzb3VyY2UgPSByZXNvdXJjZTtcclxuICAgICAgICB0aGlzLmVuZHBvaW50ID0gZW5kcG9pbnQ7XHJcbiAgICAgICAgdGhpcy5hdXRob3JpemF0aW9uID0gYXV0aG9yaXphdGlvbjtcclxuICAgICAgICB0aGlzLnRpbWVvdXQgPSB0aW1lb3V0O1xyXG5cclxuICAgICAgICBleHRlbnNpb25zLmZvckVhY2goKGV4dCkgPT4gdGhpcy51c2UoZXh0KSk7XHJcbiAgICB9XHJcblxyXG4gICAgdXNlKGV4dDogRXh0ZW5zaW9uKTtcclxuICAgIHVzZShleHQ6IEV4dGVuc2lvbkFzRnVuYyk7XHJcbiAgICB1c2UoZXh0OiBhbnkpIHtcclxuICAgICAgICBpZiAodHlwZW9mIGV4dC5wcm90b3R5cGUuaW5pdCA9PT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICAgICAgICAobmV3IGV4dCgpKS5pbml0KHRoaXMpO1xyXG4gICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGV4dC5pbml0ID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgICAgIGV4dC5pbml0KHRoaXMpO1xyXG4gICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGV4dCA9PT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICAgICAgICBleHQodGhpcyk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIG5leHRJZCgpIHtcclxuICAgICAgICByZXR1cm4gc2hvcnRpZC5nZW5lcmF0ZSgpO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbm5lY3QoKTogdm9pZCB7XHJcbiAgICAgICAgaWYgKHRoaXMuc3RhdHVzICE9PSBDb25uZWN0aW9uU3RhdHVzLkRpc2Nvbm5lY3RlZCkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLnN0YXR1cyA9IENvbm5lY3Rpb25TdGF0dXMuQ29ubmVjdGluZztcclxuXHJcbiAgICAgICAgZGVidWcoJ2Nvbm5lY3QgZW5kcG9pbnQ9JywgdGhpcy5lbmRwb2ludCk7XHJcblxyXG4gICAgICAgIHRoaXMuZW1pdCgnY29ubmVjdGluZycpO1xyXG5cclxuICAgICAgICB2YXIgc29ja2V0ID0gbmV3IFdlYlNvY2tldCh0aGlzLmVuZHBvaW50LCBbJ3JhdGF0b3NrciddKTtcclxuXHJcbiAgICAgICAgc29ja2V0Lm9ub3BlbiA9IChldnQpID0+IHtcclxuICAgICAgICAgICAgZGVidWcoJ2Nvbm5lY3Qgb25vcGVuPScsIGV2dCk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLl93c0JpbmQoc29ja2V0KTtcclxuICAgICAgICB9O1xyXG4gICAgICAgIHNvY2tldC5vbmVycm9yID0gKGV2dCkgPT4ge1xyXG4gICAgICAgICAgICBkZWJ1ZygnY29ubmVjdCBvbmVycm9yPScsIGV2dCk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmVtaXQoJ3RyYW5zcG9ydDplcnJvcicsIGV2dCk7XHJcbiAgICAgICAgICAgIHRoaXMuX3dzRGlzY29ubmVjdChzb2NrZXQsIGV2dCk7XHJcbiAgICAgICAgfTtcclxuICAgICAgICBzb2NrZXQub25jbG9zZSA9IChldnQpID0+IHtcclxuICAgICAgICAgICAgZGVidWcoJ2Nvbm5lY3Qgb25jbG9zZT0nLCBldnQpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5lbWl0KCd0cmFuc3BvcnQ6Y2xvc2UnLCBldnQpO1xyXG4gICAgICAgICAgICB0aGlzLl93c0Rpc2Nvbm5lY3Qoc29ja2V0LCBldnQpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBkaXNjb25uZWN0KHJlYXNvbjogYW55ID0gdGhpcyk6IHZvaWQge1xyXG4gICAgICAgIHRoaXMuX3dzRGlzY29ubmVjdCh0aGlzLl9zb2NrZXQsIHJlYXNvbik7XHJcbiAgICB9XHJcblxyXG4gICAgcHJvdGVjdGVkIF93c0Rpc2Nvbm5lY3Qoc29ja2V0OiBXZWJTb2NrZXQsIHJlYXNvbj86IGFueSk6IHZvaWQge1xyXG4gICAgICAgIGRlYnVnKCdkaXNjb25uZWN0IHJlYXNvbj0nLCByZWFzb24pO1xyXG5cclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBpZiAoc29ja2V0KSB7XHJcbiAgICAgICAgICAgICAgICBzb2NrZXQub25vcGVuID0gbnVsbDtcclxuICAgICAgICAgICAgICAgIHNvY2tldC5vbmVycm9yID0gbnVsbDtcclxuICAgICAgICAgICAgICAgIHNvY2tldC5vbm1lc3NhZ2UgPSBudWxsO1xyXG4gICAgICAgICAgICAgICAgc29ja2V0Lm9uY2xvc2UgPSBudWxsO1xyXG4gICAgICAgICAgICAgICAgc29ja2V0LmNsb3NlKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IGNhdGNoIChlcnIpIHtcclxuICAgICAgICAgICAgLy8gbm90aGluZyB0byBkbyBoZXJlLCB3ZSBhcmUgcmVsZWFzaW5nIHRoZSBzb2NrZXRcclxuICAgICAgICB9IGZpbmFsbHkge1xyXG4gICAgICAgICAgICB0aGlzLl9zb2NrZXQgPSBudWxsO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgT2JqZWN0LmtleXModGhpcy5fbmVlZHNBY2spLmZvckVhY2goKGspID0+IHtcclxuICAgICAgICAgICAgdGhpcy5fbmVlZHNBY2tba10uZXJyb3IocmVhc29uKTtcclxuICAgICAgICB9KSwgdGhpcy5fbmVlZHNBY2sgPSB7fTtcclxuXHJcbiAgICAgICAgdGhpcy5zdGF0dXMgPSBDb25uZWN0aW9uU3RhdHVzLkRpc2Nvbm5lY3RlZDtcclxuXHJcbiAgICAgICAgdGhpcy5lbWl0KCdkaXNjb25uZWN0ZWQnLCByZWFzb24pO1xyXG4gICAgfVxyXG5cclxuICAgIHByb3RlY3RlZCBfd3NCaW5kKHNvY2tldDogV2ViU29ja2V0KTogdm9pZCB7XHJcbiAgICAgICAgc29ja2V0Lm9ub3BlbiA9IG51bGw7XHJcbiAgICAgICAgc29ja2V0Lm9uZXJyb3IgPSB0aGlzLl93c0Vycm9yLmJpbmQodGhpcyk7XHJcbiAgICAgICAgc29ja2V0Lm9ubWVzc2FnZSA9IHRoaXMuX3dzTWVzc2FnZS5iaW5kKHRoaXMpO1xyXG4gICAgICAgIHNvY2tldC5vbmNsb3NlID0gdGhpcy5fd3NDbG9zZS5iaW5kKHRoaXMpO1xyXG5cclxuICAgICAgICB0aGlzLl9zb2NrZXQgPSBzb2NrZXQ7XHJcblxyXG4gICAgICAgIHRoaXMuc3RhdHVzID0gQ29ubmVjdGlvblN0YXR1cy5Db25uZWN0ZWQ7XHJcblxyXG4gICAgICAgIHRoaXMuZW1pdCgnY29ubmVjdGVkJyk7XHJcblxyXG4gICAgICAgIHZhciBhdXRoOiBzdHJpbmc7XHJcblxyXG4gICAgICAgIGF1dGggPSB0eXBlb2YgdGhpcy5hdXRob3JpemF0aW9uID09PSAnZnVuY3Rpb24nID8gKDxBdXRob3JpemF0aW9uRnVuYz50aGlzLmF1dGhvcml6YXRpb24pKCkgOiA8c3RyaW5nPnRoaXMuYXV0aG9yaXphdGlvbjtcclxuXHJcbiAgICAgICAgdmFyIG1lc3NhZ2UgPSA8QXV0aD57XHJcbiAgICAgICAgICAgIGlkOiB0aGlzLm5leHRJZCgpLFxyXG4gICAgICAgICAgICB0eXBlOiAnYXV0aCcsXHJcbiAgICAgICAgICAgIGF1dGhvcml6YXRpb246IGF1dGhcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBpZiAodGhpcy5hZ2VudCkgbWVzc2FnZS5hZ2VudCA9IHRoaXMuYWdlbnQ7XHJcbiAgICAgICAgaWYgKHRoaXMucmVzb3VyY2UpIG1lc3NhZ2UucmVzb3VyY2UgPSB0aGlzLnJlc291cmNlO1xyXG5cclxuICAgICAgICB0aGlzLl93c1NlbmQobWVzc2FnZSkudGhlbigoYWNrKSA9PiB7XHJcbiAgICAgICAgICAgIGRlYnVnKCdhdXRoZW50aWNhdGlvbiBhY2s9JywgYWNrKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuc3RhdHVzID0gQ29ubmVjdGlvblN0YXR1cy5BdXRoZW50aWNhdGVkO1xyXG4gICAgICAgICAgICB0aGlzLmVtaXQoJ2F1dGhlbnRpY2F0ZWQnLCBhY2spO1xyXG4gICAgICAgIH0sIChlcnIpID0+IHtcclxuICAgICAgICAgICAgZGVidWcoJ2F1dGhlbnRpY2F0aW9uIGVycm9yPScsIGVycik7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmVtaXQoJ3Byb3RvY29sOmVycm9yJywgZXJyKTtcclxuICAgICAgICAgICAgdGhpcy5fd3NEaXNjb25uZWN0KHRoaXMuX3NvY2tldCwgZXJyKTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBwcm90ZWN0ZWQgX3dzSW5ib3VuZEVycm9yKG1lc3NhZ2U6IEVycm9yKSB7XHJcbiAgICAgICAgaWYgKG1lc3NhZ2UuY29kZSA9PT0gJ2F1dGhfZmFpbGVkJykge1xyXG4gICAgICAgICAgICBkZWJ1ZygnYXV0aGVudGljYXRpb24gZmFpbHVyZT0nLCBtZXNzYWdlKTtcclxuICAgICAgICAgICAgdGhpcy5fd3NEaXNjb25uZWN0KHRoaXMuX3NvY2tldCwgbWVzc2FnZSk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy5lbWl0KCdwcm90b2NvbDplcnJvcicsIG1lc3NhZ2UpO1xyXG4gICAgICAgICAgICBjb25zdCBhY2sgPSB0aGlzLl9uZWVkc0Fja1ttZXNzYWdlLmlkXTtcclxuICAgICAgICAgICAgaWYgKGFjaykge1xyXG4gICAgICAgICAgICAgICAgYWNrLmVycm9yKG1lc3NhZ2UpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByb3RlY3RlZCBfd3NJbmJvdW5kQWNrKG1lc3NhZ2U6IEFjaykge1xyXG4gICAgICAgIGNvbnN0IGFjayA9IHRoaXMuX25lZWRzQWNrW21lc3NhZ2UucmVwbHlfdG9dO1xyXG4gICAgICAgIGlmIChhY2spIHtcclxuICAgICAgICAgICAgbWVzc2FnZS5lcnJvciA/IGFjay5lcnJvcihtZXNzYWdlLmVycm9yKSA6IGFjay5vayhtZXNzYWdlKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJvdGVjdGVkIF93c0luYm91bmRPdGhlcihtZXNzYWdlOiBPdGhlcikge1xyXG4gICAgICAgIHRoaXMuZW1pdChgJHttZXNzYWdlLnR5cGV9YCwgbWVzc2FnZSk7XHJcbiAgICB9XHJcblxyXG4gICAgcHJvdGVjdGVkIF93c01lc3NhZ2UoZXZ0KSB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgdGhpcy5lbWl0KCdyYXc6aW5jb21taW5nJywgZXZ0LmRhdGEpO1xyXG4gICAgICAgICAgICBjb25zdCBtZXNzYWdlID0gPEluYm91bmQ+SlNPTi5wYXJzZShldnQuZGF0YSk7XHJcbiAgICAgICAgICAgIGRlYnVnKCdyZWNlaXZlPScsIG1lc3NhZ2UpO1xyXG4gICAgICAgICAgICBpZiAobWVzc2FnZS50eXBlID09PSAnZXJyb3InKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLl93c0luYm91bmRFcnJvcig8RXJyb3I+bWVzc2FnZSk7XHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAobWVzc2FnZS50eXBlID09PSAnYWNrJykge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5fd3NJbmJvdW5kQWNrKDxBY2s+bWVzc2FnZSk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLl93c0luYm91bmRPdGhlcig8T3RoZXI+bWVzc2FnZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IGNhdGNoIChlcnIpIHtcclxuICAgICAgICAgICAgdGhpcy5lbWl0KCdwcm90b2NvbDplcnJvcicsIGVycik7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByb3RlY3RlZCBfd3NFcnJvcihldnQpIHtcclxuICAgICAgICB0aGlzLmVtaXQoJ3RyYW5zcG9ydDplcnJvcicsIGV2dCk7XHJcbiAgICAgICAgdGhpcy5fd3NEaXNjb25uZWN0KHRoaXMuX3NvY2tldCwgZXZ0KTtcclxuICAgIH1cclxuXHJcbiAgICBwcm90ZWN0ZWQgX3dzQ2xvc2UoZXZ0KSB7XHJcbiAgICAgICAgdGhpcy5lbWl0KCd0cmFuc3BvcnQ6Y2xvc2UnLCBldnQpO1xyXG4gICAgICAgIHRoaXMuX3dzRGlzY29ubmVjdCh0aGlzLl9zb2NrZXQsIGV2dCk7XHJcbiAgICB9XHJcblxyXG4gICAgcHJvdGVjdGVkIF93c1NlbmQobWVzc2FnZTogT3V0Ym91bmQsIHRpbWVvdXQ6IG51bWJlciA9IHRoaXMudGltZW91dCk6IFByb21pc2U8QWNrPiB7XHJcbiAgICAgICAgaWYgKHRoaXMuc3RhdHVzIDwgQ29ubmVjdGlvblN0YXR1cy5Db25uZWN0ZWQpIHtcclxuICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KG5ldyBNZXNzYWdlU2VuZEVycm9yKCdDYW5ub3Qgc2VuZCBkYXRhIGFjcm9zcyBhIHNvY2tldCB0aGF0IGlzIG5vdCBjb25uZWN0ZWQuJywgTWVzc2FnZVNlbmRFcnJvckNhdXNlLk5vQXV0aCkpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZGVidWcoJ3NlbmQ9JywgbWVzc2FnZSk7XHJcblxyXG4gICAgICAgIHZhciBkYXRhO1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGRhdGEgPSBKU09OLnN0cmluZ2lmeShtZXNzYWdlKTtcclxuICAgICAgICB9IGNhdGNoIChlcnIpIHtcclxuICAgICAgICAgICAgdGhpcy5lbWl0KCdwcm90b2NvbDplcnJvcicsIGVycik7XHJcbiAgICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChuZXcgTWVzc2FnZVNlbmRFcnJvcignQ291bGQgbm90IHNlcmlhbGl6ZSBtZXNzYWdlLicsIE1lc3NhZ2VTZW5kRXJyb3JDYXVzZS5TZXJpYWxpemF0aW9uLCBlcnIsIG1lc3NhZ2UpKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuZW1pdCgncmF3Om91dGdvaW5nJywgZGF0YSk7XHJcblxyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHNvY2tldCA9IHRoaXMuX3NvY2tldDtcclxuICAgICAgICAgICAgc29ja2V0LnNlbmQoZGF0YSk7XHJcbiAgICAgICAgICAgIGlmIChzb2NrZXQgIT09IHRoaXMuX3NvY2tldCkge1xyXG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdTb2NrZXQgd2FzIGRlc3Ryb3llZCBkdXJpbmcgc2VuZC4nKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0gY2F0Y2ggKGVycikge1xyXG4gICAgICAgICAgICBkZWJ1Zygnc2VuZCBlcnI9JywgZXJyKTtcclxuICAgICAgICAgICAgdGhpcy5lbWl0KCd0cmFuc3BvcnQ6ZXJyb3InLCBlcnIpO1xyXG4gICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QobmV3IE1lc3NhZ2VTZW5kRXJyb3IoJ0FuIGVycm9yIG9jY3VycmVkIGluIHRoZSB0cmFuc3BvcnQuJywgTWVzc2FnZVNlbmRFcnJvckNhdXNlLlRyYW5zcG9ydCwgZXJyLCBtZXNzYWdlKSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAobWVzc2FnZS5pZCkge1xyXG4gICAgICAgICAgICBjb25zdCBpZCA9IG1lc3NhZ2UuaWQ7XHJcbiAgICAgICAgICAgIGNvbnN0IGNvbnRleHQgPSB0aGlzLl9uZWVkc0Fja1tpZF0gPSA8UGVuZGluZ0Fja0NvbnRleHQ+eyBpZDogaWQgfTtcclxuICAgICAgICAgICAgY29uc3QgcHJvbWlzZSA9IG5ldyBQcm9taXNlKChvaywgZXJyKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBjb250ZXh0Lm9rID0gb2s7XHJcbiAgICAgICAgICAgICAgICBjb250ZXh0LmVycm9yID0gZXJyO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgY29uc3QgdGltZXIgPSBzZXRUaW1lb3V0KCgpID0+IHtcclxuICAgICAgICAgICAgICAgIGRlYnVnKCdhY2sgdGltZW91dD0nLCB0aW1lb3V0KTtcclxuICAgICAgICAgICAgICAgIGNvbnRleHQuZXJyb3IobmV3IE1lc3NhZ2VTZW5kRXJyb3IoJ0RpZCBub3QgcmVjZWl2ZSBhY2tub3dsZWRnZW1lbnQgaW4gdGhlIHRpbWVvdXQgcGVyaW9kLicsIE1lc3NhZ2VTZW5kRXJyb3JDYXVzZS5Ob0Fjaywgdm9pZCAwLCBtZXNzYWdlKSlcclxuICAgICAgICAgICAgfSwgdGltZW91dCk7XHJcbiAgICAgICAgICAgIGNvbnN0IGNsZWFudXAgPSAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBjbGVhclRpbWVvdXQodGltZXIpO1xyXG4gICAgICAgICAgICAgICAgZGVsZXRlIHRoaXMuX25lZWRzQWNrW2lkXTtcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgcmV0dXJuIHByb21pc2UudGhlbigoYWNrOiBBY2spID0+IHtcclxuICAgICAgICAgICAgICAgIGRlYnVnKCdhY2s9JywgYWNrKTtcclxuICAgICAgICAgICAgICAgIGNsZWFudXAoKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBhY2s7XHJcbiAgICAgICAgICAgIH0sIChlcnIpID0+IHtcclxuICAgICAgICAgICAgICAgIGRlYnVnKCdhY2sgZXJyb3I9JywgZXJyKTtcclxuICAgICAgICAgICAgICAgIGNsZWFudXAoKTtcclxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBNZXNzYWdlU2VuZEVycm9yKCdBbiBlcnJvciBvY2N1cnJlZCBkdXJpbmcgcHJvbWlzZSByZXNvbHV0aW9uJywgTWVzc2FnZVNlbmRFcnJvckNhdXNlLlByb21pc2UsIGVyciwgbWVzc2FnZSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoeyB0eXBlOiAnYWNrJywgcmVwbHlfdG86ICdzdWNjZXNzJywgcmVwbHlfdHlwZTogbWVzc2FnZS50eXBlIH0gYXMgQWNrKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgc2VuZChtZXNzYWdlOiBPdXRib3VuZCk6IFByb21pc2U8QWNrPiB7XHJcbiAgICAgICAgaWYgKHRoaXMuc3RhdHVzIDwgQ29ubmVjdGlvblN0YXR1cy5BdXRoZW50aWNhdGVkKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChuZXcgTWVzc2FnZVNlbmRFcnJvcignQ2Fubm90IHNlbmQgZGF0YSBhY3Jvc3MgYSBzb2NrZXQgdGhhdCBpcyBub3QgYXV0aGVudGljYXRlZC4nLCBNZXNzYWdlU2VuZEVycm9yQ2F1c2UuTm9BdXRoLCB2b2lkIDAsIG1lc3NhZ2UpKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX3dzU2VuZChtZXNzYWdlKTtcclxuICAgIH1cclxuXHJcbiAgICBfZW5zdXJlQ2FuQWNrKGFjazogYm9vbGVhbiwgbWVzc2FnZTogT3V0Ym91bmQpOiBPdXRib3VuZCB7XHJcbiAgICAgICAgaWYgKGFjayAmJiAhKCdpZCcgaW4gbWVzc2FnZSkpIHsgbWVzc2FnZS5pZCA9IHRoaXMubmV4dElkKCk7IH1cclxuICAgICAgICByZXR1cm4gbWVzc2FnZTtcclxuICAgIH1cclxuXHJcbiAgICBzZW5kUGluZyhtZXNzYWdlOiBQaW5nID0gPFBpbmc+e30sIGFjazogYm9vbGVhbiA9IHRydWUpOiBQcm9taXNlPEFjaz4ge1xyXG4gICAgICAgIG1lc3NhZ2UudHlwZSA9ICdwaW5nJztcclxuICAgICAgICByZXR1cm4gdGhpcy5zZW5kKHRoaXMuX2Vuc3VyZUNhbkFjayhhY2ssIG1lc3NhZ2UpKTtcclxuICAgIH1cclxuXHJcbiAgICBzZW5kQ2hhdChtZXNzYWdlOiBDaGF0LCBhY2s6IGJvb2xlYW4gPSB0cnVlKTogUHJvbWlzZTxBY2s+IHtcclxuICAgICAgICBtZXNzYWdlLnR5cGUgPSAnY2hhdCc7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuc2VuZCh0aGlzLl9lbnN1cmVDYW5BY2soYWNrLCBtZXNzYWdlKSk7XHJcbiAgICB9XHJcblxyXG4gICAgc2VuZFByZXNlbmNlQ2hhbmdlKG1lc3NhZ2U6IFByZXNlbmNlQ2hhbmdlLCBhY2s6IGJvb2xlYW4gPSBmYWxzZSk6IFByb21pc2U8QWNrPiB7XHJcbiAgICAgICAgbWVzc2FnZS50eXBlID0gJ3ByZXNlbmNlX2NoYW5nZSc7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuc2VuZCh0aGlzLl9lbnN1cmVDYW5BY2soYWNrLCBtZXNzYWdlKSk7XHJcbiAgICB9XHJcblxyXG4gICAgc2VuZFZvaWNlQ2hhbmdlKG1lc3NhZ2U6IFZvaWNlQ2hhbmdlLCBhY2s6IGJvb2xlYW4gPSBmYWxzZSk6IFByb21pc2U8QWNrPiB7XHJcbiAgICAgICAgbWVzc2FnZS50eXBlID0gJ3ZvaWNlX2NoYW5nZSc7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuc2VuZCh0aGlzLl9lbnN1cmVDYW5BY2soYWNrLCBtZXNzYWdlKSk7XHJcbiAgICB9XHJcblxyXG4gICAgc2VuZFVzZXJUeXBpbmcobWVzc2FnZTogVXNlclR5cGluZywgYWNrOiBib29sZWFuID0gZmFsc2UpOiBQcm9taXNlPEFjaz4ge1xyXG4gICAgICAgIG1lc3NhZ2UudHlwZSA9ICd1c2VyX3R5cGluZyc7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuc2VuZCh0aGlzLl9lbnN1cmVDYW5BY2soYWNrLCBtZXNzYWdlKSk7XHJcbiAgICB9XHJcblxyXG4gICAgc2VuZFRlYW1Kb2luKG1lc3NhZ2U6IFRlYW1Kb2luLCBhY2s6IGJvb2xlYW4gPSBmYWxzZSk6IFByb21pc2U8QWNrPiB7XHJcbiAgICAgICAgbWVzc2FnZS50eXBlID0gJ3RlYW1fam9pbic7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuc2VuZCh0aGlzLl9lbnN1cmVDYW5BY2soYWNrLCBtZXNzYWdlKSk7XHJcbiAgICB9XHJcblxyXG4gICAgc2VuZFRlYW1MZWF2ZShtZXNzYWdlOiBUZWFtTGVhdmUsIGFjazogYm9vbGVhbiA9IGZhbHNlKTogUHJvbWlzZTxBY2s+IHtcclxuICAgICAgICBtZXNzYWdlLnR5cGUgPSAndGVhbV9sZWF2ZSc7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuc2VuZCh0aGlzLl9lbnN1cmVDYW5BY2soYWNrLCBtZXNzYWdlKSk7XHJcbiAgICB9XHJcbn1cclxuIl19