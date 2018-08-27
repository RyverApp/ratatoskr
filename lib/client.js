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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpZW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL2NsaWVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7QUFBQSxpQ0FBc0M7QUFFdEMsOEJBQWdDO0FBQ2hDLGlDQUFtQztBQUduQyxJQUFNLEtBQUssR0FBb0IsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLGtCQUFrQixDQUFDLENBQUM7QUFFcEUsSUFBWSxnQkFLWDtBQUxELFdBQVksZ0JBQWdCO0lBQ3hCLHVFQUFnQixDQUFBO0lBQ2hCLG1FQUFjLENBQUE7SUFDZCxpRUFBYSxDQUFBO0lBQ2IseUVBQWlCLENBQUE7QUFDckIsQ0FBQyxFQUxXLGdCQUFnQixHQUFoQix3QkFBZ0IsS0FBaEIsd0JBQWdCLFFBSzNCO0FBNkJELElBQVkscUJBT1g7QUFQRCxXQUFZLHFCQUFxQjtJQUM3QixpRkFBZ0IsQ0FBQTtJQUNoQixxRUFBVSxDQUFBO0lBQ1YsbUVBQVMsQ0FBQTtJQUNULG1GQUFpQixDQUFBO0lBQ2pCLDJFQUFhLENBQUE7SUFDYix1RUFBVyxDQUFBO0FBQ2YsQ0FBQyxFQVBXLHFCQUFxQixHQUFyQiw2QkFBcUIsS0FBckIsNkJBQXFCLFFBT2hDO0FBRUQ7SUFBc0Msb0NBQUs7SUFLdkMsMEJBQVksT0FBZSxFQUFFLEtBQTRCLEVBQUUsTUFBWSxFQUFFLElBQWU7UUFBeEYsWUFDSSxrQkFBTSxPQUFPLENBQUMsU0FLakI7UUFIRyxLQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQztRQUNuQixLQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztRQUNyQixLQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQzs7SUFDckIsQ0FBQztJQUNMLHVCQUFDO0FBQUQsQ0FBQyxBQVpELENBQXNDLEtBQUssR0FZMUM7QUFaWSw0Q0FBZ0I7QUFjN0I7SUFBNEIsMEJBQVk7SUFXcEMsZ0JBQVksRUFBNEg7WUFBNUgsNEJBQTRILEVBQTFILHNCQUFRLEVBQUUsZ0NBQWEsRUFBRSxlQUFrQixFQUFsQix1Q0FBa0IsRUFBRSxnQkFBYSxFQUFiLGtDQUFhLEVBQUUsYUFBbUIsRUFBbkIsd0NBQW1CLEVBQUUsa0JBQWUsRUFBZixvQ0FBZTtRQUE5RyxZQUNJLGlCQUFPLFNBU1Y7UUFwQkQsWUFBTSxHQUFxQixnQkFBZ0IsQ0FBQyxZQUFZLENBQUM7UUFLekQsYUFBTyxHQUFXLENBQUMsR0FBRyxJQUFJLENBQUM7UUFHakIsZUFBUyxHQUF3QyxFQUFFLENBQUM7UUFLMUQsS0FBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUM7UUFDbkIsS0FBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUM7UUFDekIsS0FBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUM7UUFDekIsS0FBSSxDQUFDLGFBQWEsR0FBRyxhQUFhLENBQUM7UUFDbkMsS0FBSSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUM7UUFFdkIsVUFBVSxDQUFDLE9BQU8sQ0FBQyxVQUFDLEdBQUcsSUFBSyxPQUFBLEtBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQWIsQ0FBYSxDQUFDLENBQUM7O0lBQy9DLENBQUM7SUFJRCxvQkFBRyxHQUFILFVBQUksR0FBUTtRQUNSLEVBQUUsQ0FBQyxDQUFDLE9BQU8sR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEtBQUssVUFBVSxDQUFDLENBQUMsQ0FBQztZQUMzQyxDQUFDLElBQUksR0FBRyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDM0IsQ0FBQztRQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxPQUFPLEdBQUcsQ0FBQyxJQUFJLEtBQUssVUFBVSxDQUFDLENBQUMsQ0FBQztZQUN4QyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ25CLENBQUM7UUFBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsT0FBTyxHQUFHLEtBQUssVUFBVSxDQUFDLENBQUMsQ0FBQztZQUNuQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDZCxDQUFDO0lBQ0wsQ0FBQztJQUVELHVCQUFNLEdBQU47UUFDSSxNQUFNLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFDO0lBQzlCLENBQUM7SUFFRCx3QkFBTyxHQUFQO1FBQUEsaUJBOEJDO1FBN0JHLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLEtBQUssZ0JBQWdCLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQztZQUNoRCxNQUFNLENBQUM7UUFDWCxDQUFDO1FBRUQsSUFBSSxDQUFDLE1BQU0sR0FBRyxnQkFBZ0IsQ0FBQyxVQUFVLENBQUM7UUFFMUMsS0FBSyxDQUFDLG1CQUFtQixFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUUxQyxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBRXhCLElBQUksTUFBTSxHQUFHLElBQUksU0FBUyxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDO1FBRXpELE1BQU0sQ0FBQyxNQUFNLEdBQUcsVUFBQyxHQUFHO1lBQ2hCLEtBQUssQ0FBQyxpQkFBaUIsRUFBRSxHQUFHLENBQUMsQ0FBQztZQUU5QixLQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3pCLENBQUMsQ0FBQztRQUNGLE1BQU0sQ0FBQyxPQUFPLEdBQUcsVUFBQyxHQUFHO1lBQ2pCLEtBQUssQ0FBQyxrQkFBa0IsRUFBRSxHQUFHLENBQUMsQ0FBQztZQUUvQixLQUFJLENBQUMsSUFBSSxDQUFDLGlCQUFpQixFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQ2xDLEtBQUksQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ3BDLENBQUMsQ0FBQztRQUNGLE1BQU0sQ0FBQyxPQUFPLEdBQUcsVUFBQyxHQUFHO1lBQ2pCLEtBQUssQ0FBQyxrQkFBa0IsRUFBRSxHQUFHLENBQUMsQ0FBQztZQUUvQixLQUFJLENBQUMsSUFBSSxDQUFDLGlCQUFpQixFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQ2xDLEtBQUksQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ3BDLENBQUMsQ0FBQTtJQUNMLENBQUM7SUFFRCwyQkFBVSxHQUFWLFVBQVcsTUFBa0I7UUFBbEIsdUJBQUEsRUFBQSxhQUFrQjtRQUN6QixJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDN0MsQ0FBQztJQUVTLDhCQUFhLEdBQXZCLFVBQXdCLE1BQWlCLEVBQUUsTUFBWTtRQUF2RCxpQkF3QkM7UUF2QkcsS0FBSyxDQUFDLG9CQUFvQixFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBRXBDLElBQUksQ0FBQztZQUNELEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7Z0JBQ1QsTUFBTSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUM7Z0JBQ3JCLE1BQU0sQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDO2dCQUN0QixNQUFNLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQztnQkFDeEIsTUFBTSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUM7Z0JBQ3RCLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNuQixDQUFDO1FBQ0wsQ0FBQztRQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFFZixDQUFDO2dCQUFTLENBQUM7WUFDUCxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQztRQUN4QixDQUFDO1FBRUQsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsT0FBTyxDQUFDLFVBQUMsQ0FBQztZQUNsQyxLQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNwQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsU0FBUyxHQUFHLEVBQUUsQ0FBQztRQUV4QixJQUFJLENBQUMsTUFBTSxHQUFHLGdCQUFnQixDQUFDLFlBQVksQ0FBQztRQUU1QyxJQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxNQUFNLENBQUMsQ0FBQztJQUN0QyxDQUFDO0lBRVMsd0JBQU8sR0FBakIsVUFBa0IsTUFBaUI7UUFBbkMsaUJBb0NDO1FBbkNHLE1BQU0sQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDO1FBQ3JCLE1BQU0sQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDMUMsTUFBTSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUM5QyxNQUFNLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRTFDLElBQUksQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFDO1FBRXRCLElBQUksQ0FBQyxNQUFNLEdBQUcsZ0JBQWdCLENBQUMsU0FBUyxDQUFDO1FBRXpDLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7UUFFdkIsSUFBSSxJQUFZLENBQUM7UUFFakIsSUFBSSxHQUFHLE9BQU8sSUFBSSxDQUFDLGFBQWEsS0FBSyxVQUFVLEdBQXVCLElBQUksQ0FBQyxhQUFjLEVBQUUsR0FBVyxJQUFJLENBQUMsYUFBYSxDQUFDO1FBRXpILElBQUksT0FBTyxHQUFTO1lBQ2hCLEVBQUUsRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFO1lBQ2pCLElBQUksRUFBRSxNQUFNO1lBQ1osYUFBYSxFQUFFLElBQUk7U0FDdEIsQ0FBQztRQUVGLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUM7WUFBQyxPQUFPLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUM7UUFDM0MsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQztZQUFDLE9BQU8sQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQztRQUVwRCxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFDLEdBQUc7WUFDM0IsS0FBSyxDQUFDLHFCQUFxQixFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBRWxDLEtBQUksQ0FBQyxNQUFNLEdBQUcsZ0JBQWdCLENBQUMsYUFBYSxDQUFDO1lBQzdDLEtBQUksQ0FBQyxJQUFJLENBQUMsZUFBZSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ3BDLENBQUMsRUFBRSxVQUFDLEdBQUc7WUFDSCxLQUFLLENBQUMsdUJBQXVCLEVBQUUsR0FBRyxDQUFDLENBQUM7WUFFcEMsS0FBSSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxHQUFHLENBQUMsQ0FBQztZQUNqQyxLQUFJLENBQUMsYUFBYSxDQUFDLEtBQUksQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDMUMsQ0FBQyxDQUFDLENBQUM7SUFDUCxDQUFDO0lBRVMsZ0NBQWUsR0FBekIsVUFBMEIsT0FBYztRQUNwQyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxLQUFLLGFBQWEsQ0FBQyxDQUFDLENBQUM7WUFDakMsS0FBSyxDQUFDLHlCQUF5QixFQUFFLE9BQU8sQ0FBQyxDQUFDO1lBQzFDLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQztRQUM5QyxDQUFDO1FBQUMsSUFBSSxDQUFDLENBQUM7WUFDSixJQUFJLENBQUMsSUFBSSxDQUFDLGdCQUFnQixFQUFFLE9BQU8sQ0FBQyxDQUFDO1lBQ3JDLElBQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ3ZDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7Z0JBQ04sR0FBRyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUN2QixDQUFDO1FBQ0wsQ0FBQztJQUNMLENBQUM7SUFFUyw4QkFBYSxHQUF2QixVQUF3QixPQUFZO1FBQ2hDLElBQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQzdDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDTixPQUFPLENBQUMsS0FBSyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxHQUFHLEdBQUcsQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDL0QsQ0FBQztJQUNMLENBQUM7SUFFUyxnQ0FBZSxHQUF6QixVQUEwQixPQUFjO1FBQ3BDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBRyxPQUFPLENBQUMsSUFBTSxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQzFDLENBQUM7SUFFUywyQkFBVSxHQUFwQixVQUFxQixHQUFHO1FBQ3BCLElBQUksQ0FBQztZQUNELElBQUksQ0FBQyxJQUFJLENBQUMsZUFBZSxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNyQyxJQUFNLE9BQU8sR0FBWSxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUM5QyxLQUFLLENBQUMsVUFBVSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1lBQzNCLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEtBQUssT0FBTyxDQUFDLENBQUMsQ0FBQztnQkFDM0IsSUFBSSxDQUFDLGVBQWUsQ0FBUSxPQUFPLENBQUMsQ0FBQztZQUN6QyxDQUFDO1lBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEtBQUssS0FBSyxDQUFDLENBQUMsQ0FBQztnQkFDaEMsSUFBSSxDQUFDLGFBQWEsQ0FBTSxPQUFPLENBQUMsQ0FBQztZQUNyQyxDQUFDO1lBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ0osSUFBSSxDQUFDLGVBQWUsQ0FBUSxPQUFPLENBQUMsQ0FBQztZQUN6QyxDQUFDO1FBQ0wsQ0FBQztRQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDWCxJQUFJLENBQUMsSUFBSSxDQUFDLGdCQUFnQixFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ3JDLENBQUM7SUFDTCxDQUFDO0lBRVMseUJBQVEsR0FBbEIsVUFBbUIsR0FBRztRQUNsQixJQUFJLENBQUMsSUFBSSxDQUFDLGlCQUFpQixFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ2xDLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsQ0FBQztJQUMxQyxDQUFDO0lBRVMseUJBQVEsR0FBbEIsVUFBbUIsR0FBRztRQUNsQixJQUFJLENBQUMsSUFBSSxDQUFDLGlCQUFpQixFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ2xDLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsQ0FBQztJQUMxQyxDQUFDO0lBRVMsd0JBQU8sR0FBakIsVUFBa0IsT0FBaUIsRUFBRSxPQUE4QjtRQUFuRSxpQkF3REM7UUF4RG9DLHdCQUFBLEVBQUEsVUFBa0IsSUFBSSxDQUFDLE9BQU87UUFDL0QsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO1lBQzNDLE1BQU0sQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksZ0JBQWdCLENBQUMseURBQXlELEVBQUUscUJBQXFCLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztRQUN6SSxDQUFDO1FBRUQsS0FBSyxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQztRQUV4QixJQUFJLElBQUksQ0FBQztRQUNULElBQUksQ0FBQztZQUNELElBQUksR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ25DLENBQUM7UUFBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQ1gsSUFBSSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxHQUFHLENBQUMsQ0FBQztZQUNqQyxNQUFNLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLGdCQUFnQixDQUFDLDhCQUE4QixFQUFFLHFCQUFxQixDQUFDLGFBQWEsRUFBRSxHQUFHLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQztRQUNuSSxDQUFDO1FBRUQsSUFBSSxDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFFaEMsSUFBSSxDQUFDO1lBQ0QsSUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQztZQUM1QixNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ2xCLEVBQUUsQ0FBQyxDQUFDLE1BQU0sS0FBSyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztnQkFDMUIsTUFBTSxJQUFJLEtBQUssQ0FBQyxtQ0FBbUMsQ0FBQyxDQUFDO1lBQ3pELENBQUM7UUFDTCxDQUFDO1FBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUNYLEtBQUssQ0FBQyxXQUFXLEVBQUUsR0FBRyxDQUFDLENBQUM7WUFDeEIsSUFBSSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxHQUFHLENBQUMsQ0FBQztZQUNsQyxNQUFNLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLGdCQUFnQixDQUFDLHFDQUFxQyxFQUFFLHFCQUFxQixDQUFDLFNBQVMsRUFBRSxHQUFHLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQztRQUN0SSxDQUFDO1FBRUQsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDYixJQUFNLElBQUUsR0FBRyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ3RCLElBQU0sU0FBTyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBRSxDQUFDLEdBQXNCLEVBQUUsRUFBRSxFQUFFLElBQUUsRUFBRSxDQUFDO1lBQ25FLElBQU0sT0FBTyxHQUFHLElBQUksT0FBTyxDQUFDLFVBQUMsRUFBRSxFQUFFLEdBQUc7Z0JBQ2hDLFNBQU8sQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDO2dCQUNoQixTQUFPLENBQUMsS0FBSyxHQUFHLEdBQUcsQ0FBQztZQUN4QixDQUFDLENBQUMsQ0FBQztZQUNILElBQU0sT0FBSyxHQUFHLFVBQVUsQ0FBQztnQkFDckIsS0FBSyxDQUFDLGNBQWMsRUFBRSxPQUFPLENBQUMsQ0FBQztnQkFDL0IsU0FBTyxDQUFDLEtBQUssQ0FBQyxJQUFJLGdCQUFnQixDQUFDLHdEQUF3RCxFQUFFLHFCQUFxQixDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFBO1lBQy9JLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQztZQUNaLElBQU0sU0FBTyxHQUFHO2dCQUNaLFlBQVksQ0FBQyxPQUFLLENBQUMsQ0FBQztnQkFDcEIsT0FBTyxLQUFJLENBQUMsU0FBUyxDQUFDLElBQUUsQ0FBQyxDQUFDO1lBQzlCLENBQUMsQ0FBQztZQUNGLE1BQU0sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFVBQUMsR0FBUTtnQkFDekIsS0FBSyxDQUFDLE1BQU0sRUFBRSxHQUFHLENBQUMsQ0FBQztnQkFDbkIsU0FBTyxFQUFFLENBQUM7Z0JBQ1YsTUFBTSxDQUFDLEdBQUcsQ0FBQztZQUNmLENBQUMsRUFBRSxVQUFDLEdBQUc7Z0JBQ0gsS0FBSyxDQUFDLFlBQVksRUFBRSxHQUFHLENBQUMsQ0FBQztnQkFDekIsU0FBTyxFQUFFLENBQUM7Z0JBQ1YsTUFBTSxJQUFJLGdCQUFnQixDQUFDLDZDQUE2QyxFQUFFLHFCQUFxQixDQUFDLE9BQU8sRUFBRSxHQUFHLEVBQUUsT0FBTyxDQUFDLENBQUM7WUFDM0gsQ0FBQyxDQUFDLENBQUM7UUFDUCxDQUFDO1FBQUMsSUFBSSxDQUFDLENBQUM7WUFDSixNQUFNLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxVQUFVLEVBQUUsT0FBTyxDQUFDLElBQUksRUFBUyxDQUFDLENBQUM7UUFDbEcsQ0FBQztJQUNMLENBQUM7SUFFRCxxQkFBSSxHQUFKLFVBQUssT0FBaUI7UUFDbEIsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxnQkFBZ0IsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDO1lBQy9DLE1BQU0sQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksZ0JBQWdCLENBQUMsNkRBQTZELEVBQUUscUJBQXFCLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUM7UUFDOUosQ0FBQztRQUNELE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ2pDLENBQUM7SUFFRCw4QkFBYSxHQUFiLFVBQWMsR0FBWSxFQUFFLE9BQWlCO1FBQ3pDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsSUFBSSxJQUFJLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUFDLE9BQU8sQ0FBQyxFQUFFLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQUMsQ0FBQztRQUM5RCxNQUFNLENBQUMsT0FBTyxDQUFDO0lBQ25CLENBQUM7SUFFRCx5QkFBUSxHQUFSLFVBQVMsT0FBd0IsRUFBRSxHQUFtQjtRQUE3Qyx3QkFBQSxFQUFBLFVBQXNCLEVBQUU7UUFBRSxvQkFBQSxFQUFBLFVBQW1CO1FBQ2xELE9BQU8sQ0FBQyxJQUFJLEdBQUcsTUFBTSxDQUFDO1FBQ3RCLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUM7SUFDdkQsQ0FBQztJQUVELHlCQUFRLEdBQVIsVUFBUyxPQUFhLEVBQUUsR0FBbUI7UUFBbkIsb0JBQUEsRUFBQSxVQUFtQjtRQUN2QyxPQUFPLENBQUMsSUFBSSxHQUFHLE1BQU0sQ0FBQztRQUN0QixNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDO0lBQ3ZELENBQUM7SUFFRCxtQ0FBa0IsR0FBbEIsVUFBbUIsT0FBdUIsRUFBRSxHQUFvQjtRQUFwQixvQkFBQSxFQUFBLFdBQW9CO1FBQzVELE9BQU8sQ0FBQyxJQUFJLEdBQUcsaUJBQWlCLENBQUM7UUFDakMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQztJQUN2RCxDQUFDO0lBRUQsZ0NBQWUsR0FBZixVQUFnQixPQUFvQixFQUFFLEdBQW9CO1FBQXBCLG9CQUFBLEVBQUEsV0FBb0I7UUFDdEQsT0FBTyxDQUFDLElBQUksR0FBRyxjQUFjLENBQUM7UUFDOUIsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQztJQUN2RCxDQUFDO0lBRUQsK0JBQWMsR0FBZCxVQUFlLE9BQW1CLEVBQUUsR0FBb0I7UUFBcEIsb0JBQUEsRUFBQSxXQUFvQjtRQUNwRCxPQUFPLENBQUMsSUFBSSxHQUFHLGFBQWEsQ0FBQztRQUM3QixNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDO0lBQ3ZELENBQUM7SUFFRCw2QkFBWSxHQUFaLFVBQWEsT0FBaUIsRUFBRSxHQUFvQjtRQUFwQixvQkFBQSxFQUFBLFdBQW9CO1FBQ2hELE9BQU8sQ0FBQyxJQUFJLEdBQUcsV0FBVyxDQUFDO1FBQzNCLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUM7SUFDdkQsQ0FBQztJQUVELDhCQUFhLEdBQWIsVUFBYyxPQUFrQixFQUFFLEdBQW9CO1FBQXBCLG9CQUFBLEVBQUEsV0FBb0I7UUFDbEQsT0FBTyxDQUFDLElBQUksR0FBRyxZQUFZLENBQUM7UUFDNUIsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQztJQUN2RCxDQUFDO0lBQ0wsYUFBQztBQUFELENBQUMsQUF0U0QsQ0FBNEIscUJBQVksR0FzU3ZDO0FBdFNZLHdCQUFNIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgRXZlbnRFbWl0dGVyIH0gZnJvbSAnZXZlbnRzJztcbmltcG9ydCAqIGFzIHVybCBmcm9tICd1cmwnO1xuaW1wb3J0ICogYXMgV2ViU29ja2V0IGZyb20gJ3dzJztcbmltcG9ydCAqIGFzIHNob3J0aWQgZnJvbSAnc2hvcnRpZCc7XG5pbXBvcnQgeyBBY2ssIEVycm9yLCBPdGhlciwgQXV0aCwgQ2hhdCwgUHJlc2VuY2VDaGFuZ2UsIFVzZXJUeXBpbmcsIFBpbmcsIFRlYW1Kb2luLCBUZWFtTGVhdmUsIE91dGJvdW5kLCBJbmJvdW5kLCBWb2ljZUNoYW5nZSB9IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5cbmNvbnN0IGRlYnVnOiBkZWJ1Zy5JRGVidWdnZXIgPSByZXF1aXJlKCdkZWJ1ZycpKCdyYXRhdG9za3I6Y2xpZW50Jyk7XG5cbmV4cG9ydCBlbnVtIENvbm5lY3Rpb25TdGF0dXMge1xuICAgIERpc2Nvbm5lY3RlZCA9IDAsXG4gICAgQ29ubmVjdGluZyA9IDEsXG4gICAgQ29ubmVjdGVkID0gMixcbiAgICBBdXRoZW50aWNhdGVkID0gM1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIENvbm5lY3Rpb25PcHRpb25zIHtcbiAgICBlbmRwb2ludD86IHN0cmluZztcbiAgICBhdXRob3JpemF0aW9uPzogc3RyaW5nIHwgQXV0aG9yaXphdGlvbkZ1bmM7XG4gICAgcmVzb3VyY2U/OiBzdHJpbmc7XG4gICAgYWdlbnQ/OiBzdHJpbmc7XG4gICAgdGltZW91dD86IG51bWJlcjtcbiAgICBleHRlbnNpb25zPzogYW55W107XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUGVuZGluZ0Fja0NvbnRleHQge1xuICAgIGlkOiBzdHJpbmc7XG4gICAgb2s6IChkYXRhOiBhbnkpID0+IHZvaWQ7XG4gICAgZXJyb3I6IChlcnI6IGFueSkgPT4gdm9pZDtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBBdXRob3JpemF0aW9uRnVuYyB7XG4gICAgKCk6IHN0cmluZztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBFeHRlbnNpb24ge1xuICAgIGluaXQoY2xpZW50OiBDbGllbnQpO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEV4dGVuc2lvbkFzRnVuYyB7XG4gICAgKGNsaWVudDogQ2xpZW50KTogdm9pZDtcbn1cblxuZXhwb3J0IGVudW0gTWVzc2FnZVNlbmRFcnJvckNhdXNlIHtcbiAgICBOb0Nvbm5lY3Rpb24gPSAwLFxuICAgIE5vQXV0aCA9IDEsXG4gICAgTm9BY2sgPSAyLFxuICAgIFNlcmlhbGl6YXRpb24gPSAzLFxuICAgIFRyYW5zcG9ydCA9IDQsXG4gICAgUHJvbWlzZSA9IDVcbn1cblxuZXhwb3J0IGNsYXNzIE1lc3NhZ2VTZW5kRXJyb3IgZXh0ZW5kcyBFcnJvciB7XG4gICAgZGF0YTogT3V0Ym91bmQ7XG4gICAgY2F1c2U6IE1lc3NhZ2VTZW5kRXJyb3JDYXVzZTtcbiAgICBzb3VyY2U6IGFueTtcblxuICAgIGNvbnN0cnVjdG9yKG1lc3NhZ2U6IHN0cmluZywgY2F1c2U6IE1lc3NhZ2VTZW5kRXJyb3JDYXVzZSwgc291cmNlPzogYW55LCBkYXRhPzogT3V0Ym91bmQpIHtcbiAgICAgICAgc3VwZXIobWVzc2FnZSk7XG5cbiAgICAgICAgdGhpcy5jYXVzZSA9IGNhdXNlO1xuICAgICAgICB0aGlzLnNvdXJjZSA9IHNvdXJjZTtcbiAgICAgICAgdGhpcy5kYXRhID0gZGF0YTtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBDbGllbnQgZXh0ZW5kcyBFdmVudEVtaXR0ZXIge1xuICAgIHN0YXR1czogQ29ubmVjdGlvblN0YXR1cyA9IENvbm5lY3Rpb25TdGF0dXMuRGlzY29ubmVjdGVkO1xuICAgIHJlc291cmNlOiBzdHJpbmc7XG4gICAgYWdlbnQ6IHN0cmluZztcbiAgICBlbmRwb2ludDogc3RyaW5nO1xuICAgIGF1dGhvcml6YXRpb246IHN0cmluZyB8IEF1dGhvcml6YXRpb25GdW5jO1xuICAgIHRpbWVvdXQ6IG51bWJlciA9IDUgKiAxMDAwO1xuXG4gICAgcHJvdGVjdGVkIF9zb2NrZXQ6IFdlYlNvY2tldDtcbiAgICBwcm90ZWN0ZWQgX25lZWRzQWNrOiB7IFtpZDogc3RyaW5nXTogUGVuZGluZ0Fja0NvbnRleHQgfSA9IHt9O1xuXG4gICAgY29uc3RydWN0b3IoeyBlbmRwb2ludCwgYXV0aG9yaXphdGlvbiwgdGltZW91dCA9IDUgKiAxMDAwLCByZXNvdXJjZSA9ICcnLCBhZ2VudCA9ICdSYXRhdG9za3InLCBleHRlbnNpb25zID0gW10gfTogQ29ubmVjdGlvbk9wdGlvbnMgPSB7fSkge1xuICAgICAgICBzdXBlcigpO1xuXG4gICAgICAgIHRoaXMuYWdlbnQgPSBhZ2VudDtcbiAgICAgICAgdGhpcy5yZXNvdXJjZSA9IHJlc291cmNlO1xuICAgICAgICB0aGlzLmVuZHBvaW50ID0gZW5kcG9pbnQ7XG4gICAgICAgIHRoaXMuYXV0aG9yaXphdGlvbiA9IGF1dGhvcml6YXRpb247XG4gICAgICAgIHRoaXMudGltZW91dCA9IHRpbWVvdXQ7XG5cbiAgICAgICAgZXh0ZW5zaW9ucy5mb3JFYWNoKChleHQpID0+IHRoaXMudXNlKGV4dCkpO1xuICAgIH1cblxuICAgIHVzZShleHQ6IEV4dGVuc2lvbik7XG4gICAgdXNlKGV4dDogRXh0ZW5zaW9uQXNGdW5jKTtcbiAgICB1c2UoZXh0OiBhbnkpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBleHQucHJvdG90eXBlLmluaXQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIChuZXcgZXh0KCkpLmluaXQodGhpcyk7XG4gICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGV4dC5pbml0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBleHQuaW5pdCh0aGlzKTtcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgZXh0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBleHQodGhpcyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBuZXh0SWQoKSB7XG4gICAgICAgIHJldHVybiBzaG9ydGlkLmdlbmVyYXRlKCk7XG4gICAgfVxuXG4gICAgY29ubmVjdCgpOiB2b2lkIHtcbiAgICAgICAgaWYgKHRoaXMuc3RhdHVzICE9PSBDb25uZWN0aW9uU3RhdHVzLkRpc2Nvbm5lY3RlZCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5zdGF0dXMgPSBDb25uZWN0aW9uU3RhdHVzLkNvbm5lY3Rpbmc7XG5cbiAgICAgICAgZGVidWcoJ2Nvbm5lY3QgZW5kcG9pbnQ9JywgdGhpcy5lbmRwb2ludCk7XG5cbiAgICAgICAgdGhpcy5lbWl0KCdjb25uZWN0aW5nJyk7XG5cbiAgICAgICAgdmFyIHNvY2tldCA9IG5ldyBXZWJTb2NrZXQodGhpcy5lbmRwb2ludCwgWydyYXRhdG9za3InXSk7XG5cbiAgICAgICAgc29ja2V0Lm9ub3BlbiA9IChldnQpID0+IHtcbiAgICAgICAgICAgIGRlYnVnKCdjb25uZWN0IG9ub3Blbj0nLCBldnQpO1xuXG4gICAgICAgICAgICB0aGlzLl93c0JpbmQoc29ja2V0KTtcbiAgICAgICAgfTtcbiAgICAgICAgc29ja2V0Lm9uZXJyb3IgPSAoZXZ0KSA9PiB7XG4gICAgICAgICAgICBkZWJ1ZygnY29ubmVjdCBvbmVycm9yPScsIGV2dCk7XG5cbiAgICAgICAgICAgIHRoaXMuZW1pdCgndHJhbnNwb3J0OmVycm9yJywgZXZ0KTtcbiAgICAgICAgICAgIHRoaXMuX3dzRGlzY29ubmVjdChzb2NrZXQsIGV2dCk7XG4gICAgICAgIH07XG4gICAgICAgIHNvY2tldC5vbmNsb3NlID0gKGV2dCkgPT4ge1xuICAgICAgICAgICAgZGVidWcoJ2Nvbm5lY3Qgb25jbG9zZT0nLCBldnQpO1xuXG4gICAgICAgICAgICB0aGlzLmVtaXQoJ3RyYW5zcG9ydDpjbG9zZScsIGV2dCk7XG4gICAgICAgICAgICB0aGlzLl93c0Rpc2Nvbm5lY3Qoc29ja2V0LCBldnQpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZGlzY29ubmVjdChyZWFzb246IGFueSA9IHRoaXMpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fd3NEaXNjb25uZWN0KHRoaXMuX3NvY2tldCwgcmVhc29uKTtcbiAgICB9XG5cbiAgICBwcm90ZWN0ZWQgX3dzRGlzY29ubmVjdChzb2NrZXQ6IFdlYlNvY2tldCwgcmVhc29uPzogYW55KTogdm9pZCB7XG4gICAgICAgIGRlYnVnKCdkaXNjb25uZWN0IHJlYXNvbj0nLCByZWFzb24pO1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBpZiAoc29ja2V0KSB7XG4gICAgICAgICAgICAgICAgc29ja2V0Lm9ub3BlbiA9IG51bGw7XG4gICAgICAgICAgICAgICAgc29ja2V0Lm9uZXJyb3IgPSBudWxsO1xuICAgICAgICAgICAgICAgIHNvY2tldC5vbm1lc3NhZ2UgPSBudWxsO1xuICAgICAgICAgICAgICAgIHNvY2tldC5vbmNsb3NlID0gbnVsbDtcbiAgICAgICAgICAgICAgICBzb2NrZXQuY2xvc2UoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICAvLyBub3RoaW5nIHRvIGRvIGhlcmUsIHdlIGFyZSByZWxlYXNpbmcgdGhlIHNvY2tldFxuICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgICAgdGhpcy5fc29ja2V0ID0gbnVsbDtcbiAgICAgICAgfVxuXG4gICAgICAgIE9iamVjdC5rZXlzKHRoaXMuX25lZWRzQWNrKS5mb3JFYWNoKChrKSA9PiB7XG4gICAgICAgICAgICB0aGlzLl9uZWVkc0Fja1trXS5lcnJvcihyZWFzb24pO1xuICAgICAgICB9KSwgdGhpcy5fbmVlZHNBY2sgPSB7fTtcblxuICAgICAgICB0aGlzLnN0YXR1cyA9IENvbm5lY3Rpb25TdGF0dXMuRGlzY29ubmVjdGVkO1xuXG4gICAgICAgIHRoaXMuZW1pdCgnZGlzY29ubmVjdGVkJywgcmVhc29uKTtcbiAgICB9XG5cbiAgICBwcm90ZWN0ZWQgX3dzQmluZChzb2NrZXQ6IFdlYlNvY2tldCk6IHZvaWQge1xuICAgICAgICBzb2NrZXQub25vcGVuID0gbnVsbDtcbiAgICAgICAgc29ja2V0Lm9uZXJyb3IgPSB0aGlzLl93c0Vycm9yLmJpbmQodGhpcyk7XG4gICAgICAgIHNvY2tldC5vbm1lc3NhZ2UgPSB0aGlzLl93c01lc3NhZ2UuYmluZCh0aGlzKTtcbiAgICAgICAgc29ja2V0Lm9uY2xvc2UgPSB0aGlzLl93c0Nsb3NlLmJpbmQodGhpcyk7XG5cbiAgICAgICAgdGhpcy5fc29ja2V0ID0gc29ja2V0O1xuXG4gICAgICAgIHRoaXMuc3RhdHVzID0gQ29ubmVjdGlvblN0YXR1cy5Db25uZWN0ZWQ7XG5cbiAgICAgICAgdGhpcy5lbWl0KCdjb25uZWN0ZWQnKTtcblxuICAgICAgICB2YXIgYXV0aDogc3RyaW5nO1xuXG4gICAgICAgIGF1dGggPSB0eXBlb2YgdGhpcy5hdXRob3JpemF0aW9uID09PSAnZnVuY3Rpb24nID8gKDxBdXRob3JpemF0aW9uRnVuYz50aGlzLmF1dGhvcml6YXRpb24pKCkgOiA8c3RyaW5nPnRoaXMuYXV0aG9yaXphdGlvbjtcblxuICAgICAgICB2YXIgbWVzc2FnZSA9IDxBdXRoPntcbiAgICAgICAgICAgIGlkOiB0aGlzLm5leHRJZCgpLFxuICAgICAgICAgICAgdHlwZTogJ2F1dGgnLFxuICAgICAgICAgICAgYXV0aG9yaXphdGlvbjogYXV0aFxuICAgICAgICB9O1xuXG4gICAgICAgIGlmICh0aGlzLmFnZW50KSBtZXNzYWdlLmFnZW50ID0gdGhpcy5hZ2VudDtcbiAgICAgICAgaWYgKHRoaXMucmVzb3VyY2UpIG1lc3NhZ2UucmVzb3VyY2UgPSB0aGlzLnJlc291cmNlO1xuXG4gICAgICAgIHRoaXMuX3dzU2VuZChtZXNzYWdlKS50aGVuKChhY2spID0+IHtcbiAgICAgICAgICAgIGRlYnVnKCdhdXRoZW50aWNhdGlvbiBhY2s9JywgYWNrKTtcblxuICAgICAgICAgICAgdGhpcy5zdGF0dXMgPSBDb25uZWN0aW9uU3RhdHVzLkF1dGhlbnRpY2F0ZWQ7XG4gICAgICAgICAgICB0aGlzLmVtaXQoJ2F1dGhlbnRpY2F0ZWQnLCBhY2spO1xuICAgICAgICB9LCAoZXJyKSA9PiB7XG4gICAgICAgICAgICBkZWJ1ZygnYXV0aGVudGljYXRpb24gZXJyb3I9JywgZXJyKTtcblxuICAgICAgICAgICAgdGhpcy5lbWl0KCdwcm90b2NvbDplcnJvcicsIGVycik7XG4gICAgICAgICAgICB0aGlzLl93c0Rpc2Nvbm5lY3QodGhpcy5fc29ja2V0LCBlcnIpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcm90ZWN0ZWQgX3dzSW5ib3VuZEVycm9yKG1lc3NhZ2U6IEVycm9yKSB7XG4gICAgICAgIGlmIChtZXNzYWdlLmNvZGUgPT09ICdhdXRoX2ZhaWxlZCcpIHtcbiAgICAgICAgICAgIGRlYnVnKCdhdXRoZW50aWNhdGlvbiBmYWlsdXJlPScsIG1lc3NhZ2UpO1xuICAgICAgICAgICAgdGhpcy5fd3NEaXNjb25uZWN0KHRoaXMuX3NvY2tldCwgbWVzc2FnZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmVtaXQoJ3Byb3RvY29sOmVycm9yJywgbWVzc2FnZSk7XG4gICAgICAgICAgICBjb25zdCBhY2sgPSB0aGlzLl9uZWVkc0Fja1ttZXNzYWdlLmlkXTtcbiAgICAgICAgICAgIGlmIChhY2spIHtcbiAgICAgICAgICAgICAgICBhY2suZXJyb3IobWVzc2FnZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcm90ZWN0ZWQgX3dzSW5ib3VuZEFjayhtZXNzYWdlOiBBY2spIHtcbiAgICAgICAgY29uc3QgYWNrID0gdGhpcy5fbmVlZHNBY2tbbWVzc2FnZS5yZXBseV90b107XG4gICAgICAgIGlmIChhY2spIHtcbiAgICAgICAgICAgIG1lc3NhZ2UuZXJyb3IgPyBhY2suZXJyb3IobWVzc2FnZS5lcnJvcikgOiBhY2sub2sobWVzc2FnZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcm90ZWN0ZWQgX3dzSW5ib3VuZE90aGVyKG1lc3NhZ2U6IE90aGVyKSB7XG4gICAgICAgIHRoaXMuZW1pdChgJHttZXNzYWdlLnR5cGV9YCwgbWVzc2FnZSk7XG4gICAgfVxuXG4gICAgcHJvdGVjdGVkIF93c01lc3NhZ2UoZXZ0KSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICB0aGlzLmVtaXQoJ3JhdzppbmNvbW1pbmcnLCBldnQuZGF0YSk7XG4gICAgICAgICAgICBjb25zdCBtZXNzYWdlID0gPEluYm91bmQ+SlNPTi5wYXJzZShldnQuZGF0YSk7XG4gICAgICAgICAgICBkZWJ1ZygncmVjZWl2ZT0nLCBtZXNzYWdlKTtcbiAgICAgICAgICAgIGlmIChtZXNzYWdlLnR5cGUgPT09ICdlcnJvcicpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl93c0luYm91bmRFcnJvcig8RXJyb3I+bWVzc2FnZSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKG1lc3NhZ2UudHlwZSA9PT0gJ2FjaycpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl93c0luYm91bmRBY2soPEFjaz5tZXNzYWdlKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fd3NJbmJvdW5kT3RoZXIoPE90aGVyPm1lc3NhZ2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgIHRoaXMuZW1pdCgncHJvdG9jb2w6ZXJyb3InLCBlcnIpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJvdGVjdGVkIF93c0Vycm9yKGV2dCkge1xuICAgICAgICB0aGlzLmVtaXQoJ3RyYW5zcG9ydDplcnJvcicsIGV2dCk7XG4gICAgICAgIHRoaXMuX3dzRGlzY29ubmVjdCh0aGlzLl9zb2NrZXQsIGV2dCk7XG4gICAgfVxuXG4gICAgcHJvdGVjdGVkIF93c0Nsb3NlKGV2dCkge1xuICAgICAgICB0aGlzLmVtaXQoJ3RyYW5zcG9ydDpjbG9zZScsIGV2dCk7XG4gICAgICAgIHRoaXMuX3dzRGlzY29ubmVjdCh0aGlzLl9zb2NrZXQsIGV2dCk7XG4gICAgfVxuXG4gICAgcHJvdGVjdGVkIF93c1NlbmQobWVzc2FnZTogT3V0Ym91bmQsIHRpbWVvdXQ6IG51bWJlciA9IHRoaXMudGltZW91dCk6IFByb21pc2U8QWNrPiB7XG4gICAgICAgIGlmICh0aGlzLnN0YXR1cyA8IENvbm5lY3Rpb25TdGF0dXMuQ29ubmVjdGVkKSB7XG4gICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QobmV3IE1lc3NhZ2VTZW5kRXJyb3IoJ0Nhbm5vdCBzZW5kIGRhdGEgYWNyb3NzIGEgc29ja2V0IHRoYXQgaXMgbm90IGNvbm5lY3RlZC4nLCBNZXNzYWdlU2VuZEVycm9yQ2F1c2UuTm9BdXRoKSk7XG4gICAgICAgIH1cblxuICAgICAgICBkZWJ1Zygnc2VuZD0nLCBtZXNzYWdlKTtcblxuICAgICAgICB2YXIgZGF0YTtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGRhdGEgPSBKU09OLnN0cmluZ2lmeShtZXNzYWdlKTtcbiAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICB0aGlzLmVtaXQoJ3Byb3RvY29sOmVycm9yJywgZXJyKTtcbiAgICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChuZXcgTWVzc2FnZVNlbmRFcnJvcignQ291bGQgbm90IHNlcmlhbGl6ZSBtZXNzYWdlLicsIE1lc3NhZ2VTZW5kRXJyb3JDYXVzZS5TZXJpYWxpemF0aW9uLCBlcnIsIG1lc3NhZ2UpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuZW1pdCgncmF3Om91dGdvaW5nJywgZGF0YSk7XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHNvY2tldCA9IHRoaXMuX3NvY2tldDtcbiAgICAgICAgICAgIHNvY2tldC5zZW5kKGRhdGEpO1xuICAgICAgICAgICAgaWYgKHNvY2tldCAhPT0gdGhpcy5fc29ja2V0KSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdTb2NrZXQgd2FzIGRlc3Ryb3llZCBkdXJpbmcgc2VuZC4nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICBkZWJ1Zygnc2VuZCBlcnI9JywgZXJyKTtcbiAgICAgICAgICAgIHRoaXMuZW1pdCgndHJhbnNwb3J0OmVycm9yJywgZXJyKTtcbiAgICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChuZXcgTWVzc2FnZVNlbmRFcnJvcignQW4gZXJyb3Igb2NjdXJyZWQgaW4gdGhlIHRyYW5zcG9ydC4nLCBNZXNzYWdlU2VuZEVycm9yQ2F1c2UuVHJhbnNwb3J0LCBlcnIsIG1lc3NhZ2UpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChtZXNzYWdlLmlkKSB7XG4gICAgICAgICAgICBjb25zdCBpZCA9IG1lc3NhZ2UuaWQ7XG4gICAgICAgICAgICBjb25zdCBjb250ZXh0ID0gdGhpcy5fbmVlZHNBY2tbaWRdID0gPFBlbmRpbmdBY2tDb250ZXh0PnsgaWQ6IGlkIH07XG4gICAgICAgICAgICBjb25zdCBwcm9taXNlID0gbmV3IFByb21pc2UoKG9rLCBlcnIpID0+IHtcbiAgICAgICAgICAgICAgICBjb250ZXh0Lm9rID0gb2s7XG4gICAgICAgICAgICAgICAgY29udGV4dC5lcnJvciA9IGVycjtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgY29uc3QgdGltZXIgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICBkZWJ1ZygnYWNrIHRpbWVvdXQ9JywgdGltZW91dCk7XG4gICAgICAgICAgICAgICAgY29udGV4dC5lcnJvcihuZXcgTWVzc2FnZVNlbmRFcnJvcignRGlkIG5vdCByZWNlaXZlIGFja25vd2xlZGdlbWVudCBpbiB0aGUgdGltZW91dCBwZXJpb2QuJywgTWVzc2FnZVNlbmRFcnJvckNhdXNlLk5vQWNrLCB2b2lkIDAsIG1lc3NhZ2UpKVxuICAgICAgICAgICAgfSwgdGltZW91dCk7XG4gICAgICAgICAgICBjb25zdCBjbGVhbnVwID0gKCkgPT4ge1xuICAgICAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aW1lcik7XG4gICAgICAgICAgICAgICAgZGVsZXRlIHRoaXMuX25lZWRzQWNrW2lkXTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICByZXR1cm4gcHJvbWlzZS50aGVuKChhY2s6IEFjaykgPT4ge1xuICAgICAgICAgICAgICAgIGRlYnVnKCdhY2s9JywgYWNrKTtcbiAgICAgICAgICAgICAgICBjbGVhbnVwKCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGFjaztcbiAgICAgICAgICAgIH0sIChlcnIpID0+IHtcbiAgICAgICAgICAgICAgICBkZWJ1ZygnYWNrIGVycm9yPScsIGVycik7XG4gICAgICAgICAgICAgICAgY2xlYW51cCgpO1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBNZXNzYWdlU2VuZEVycm9yKCdBbiBlcnJvciBvY2N1cnJlZCBkdXJpbmcgcHJvbWlzZSByZXNvbHV0aW9uJywgTWVzc2FnZVNlbmRFcnJvckNhdXNlLlByb21pc2UsIGVyciwgbWVzc2FnZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoeyB0eXBlOiAnYWNrJywgcmVwbHlfdG86ICdzdWNjZXNzJywgcmVwbHlfdHlwZTogbWVzc2FnZS50eXBlIH0gYXMgQWNrKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHNlbmQobWVzc2FnZTogT3V0Ym91bmQpOiBQcm9taXNlPEFjaz4ge1xuICAgICAgICBpZiAodGhpcy5zdGF0dXMgPCBDb25uZWN0aW9uU3RhdHVzLkF1dGhlbnRpY2F0ZWQpIHtcbiAgICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChuZXcgTWVzc2FnZVNlbmRFcnJvcignQ2Fubm90IHNlbmQgZGF0YSBhY3Jvc3MgYSBzb2NrZXQgdGhhdCBpcyBub3QgYXV0aGVudGljYXRlZC4nLCBNZXNzYWdlU2VuZEVycm9yQ2F1c2UuTm9BdXRoLCB2b2lkIDAsIG1lc3NhZ2UpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5fd3NTZW5kKG1lc3NhZ2UpO1xuICAgIH1cblxuICAgIF9lbnN1cmVDYW5BY2soYWNrOiBib29sZWFuLCBtZXNzYWdlOiBPdXRib3VuZCk6IE91dGJvdW5kIHtcbiAgICAgICAgaWYgKGFjayAmJiAhKCdpZCcgaW4gbWVzc2FnZSkpIHsgbWVzc2FnZS5pZCA9IHRoaXMubmV4dElkKCk7IH1cbiAgICAgICAgcmV0dXJuIG1lc3NhZ2U7XG4gICAgfVxuXG4gICAgc2VuZFBpbmcobWVzc2FnZTogUGluZyA9IDxQaW5nPnt9LCBhY2s6IGJvb2xlYW4gPSB0cnVlKTogUHJvbWlzZTxBY2s+IHtcbiAgICAgICAgbWVzc2FnZS50eXBlID0gJ3BpbmcnO1xuICAgICAgICByZXR1cm4gdGhpcy5zZW5kKHRoaXMuX2Vuc3VyZUNhbkFjayhhY2ssIG1lc3NhZ2UpKTtcbiAgICB9XG5cbiAgICBzZW5kQ2hhdChtZXNzYWdlOiBDaGF0LCBhY2s6IGJvb2xlYW4gPSB0cnVlKTogUHJvbWlzZTxBY2s+IHtcbiAgICAgICAgbWVzc2FnZS50eXBlID0gJ2NoYXQnO1xuICAgICAgICByZXR1cm4gdGhpcy5zZW5kKHRoaXMuX2Vuc3VyZUNhbkFjayhhY2ssIG1lc3NhZ2UpKTtcbiAgICB9XG5cbiAgICBzZW5kUHJlc2VuY2VDaGFuZ2UobWVzc2FnZTogUHJlc2VuY2VDaGFuZ2UsIGFjazogYm9vbGVhbiA9IGZhbHNlKTogUHJvbWlzZTxBY2s+IHtcbiAgICAgICAgbWVzc2FnZS50eXBlID0gJ3ByZXNlbmNlX2NoYW5nZSc7XG4gICAgICAgIHJldHVybiB0aGlzLnNlbmQodGhpcy5fZW5zdXJlQ2FuQWNrKGFjaywgbWVzc2FnZSkpO1xuICAgIH1cblxuICAgIHNlbmRWb2ljZUNoYW5nZShtZXNzYWdlOiBWb2ljZUNoYW5nZSwgYWNrOiBib29sZWFuID0gZmFsc2UpOiBQcm9taXNlPEFjaz4ge1xuICAgICAgICBtZXNzYWdlLnR5cGUgPSAndm9pY2VfY2hhbmdlJztcbiAgICAgICAgcmV0dXJuIHRoaXMuc2VuZCh0aGlzLl9lbnN1cmVDYW5BY2soYWNrLCBtZXNzYWdlKSk7XG4gICAgfVxuXG4gICAgc2VuZFVzZXJUeXBpbmcobWVzc2FnZTogVXNlclR5cGluZywgYWNrOiBib29sZWFuID0gZmFsc2UpOiBQcm9taXNlPEFjaz4ge1xuICAgICAgICBtZXNzYWdlLnR5cGUgPSAndXNlcl90eXBpbmcnO1xuICAgICAgICByZXR1cm4gdGhpcy5zZW5kKHRoaXMuX2Vuc3VyZUNhbkFjayhhY2ssIG1lc3NhZ2UpKTtcbiAgICB9XG5cbiAgICBzZW5kVGVhbUpvaW4obWVzc2FnZTogVGVhbUpvaW4sIGFjazogYm9vbGVhbiA9IGZhbHNlKTogUHJvbWlzZTxBY2s+IHtcbiAgICAgICAgbWVzc2FnZS50eXBlID0gJ3RlYW1fam9pbic7XG4gICAgICAgIHJldHVybiB0aGlzLnNlbmQodGhpcy5fZW5zdXJlQ2FuQWNrKGFjaywgbWVzc2FnZSkpO1xuICAgIH1cblxuICAgIHNlbmRUZWFtTGVhdmUobWVzc2FnZTogVGVhbUxlYXZlLCBhY2s6IGJvb2xlYW4gPSBmYWxzZSk6IFByb21pc2U8QWNrPiB7XG4gICAgICAgIG1lc3NhZ2UudHlwZSA9ICd0ZWFtX2xlYXZlJztcbiAgICAgICAgcmV0dXJuIHRoaXMuc2VuZCh0aGlzLl9lbnN1cmVDYW5BY2soYWNrLCBtZXNzYWdlKSk7XG4gICAgfVxufVxuIl19