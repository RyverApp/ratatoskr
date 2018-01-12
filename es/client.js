import * as tslib_1 from "tslib";
import { EventEmitter } from 'events';
import * as WebSocket from 'ws';
import debug from 'debug';
import * as shortid from 'shortid';
var log = debug('ratatoskr:client');
export var ConnectionStatus;
(function (ConnectionStatus) {
    ConnectionStatus[ConnectionStatus["Disconnected"] = 0] = "Disconnected";
    ConnectionStatus[ConnectionStatus["Connecting"] = 1] = "Connecting";
    ConnectionStatus[ConnectionStatus["Connected"] = 2] = "Connected";
    ConnectionStatus[ConnectionStatus["Authenticated"] = 3] = "Authenticated";
})(ConnectionStatus || (ConnectionStatus = {}));
export var MessageSendErrorCause;
(function (MessageSendErrorCause) {
    MessageSendErrorCause[MessageSendErrorCause["NoConnection"] = 0] = "NoConnection";
    MessageSendErrorCause[MessageSendErrorCause["NoAuth"] = 1] = "NoAuth";
    MessageSendErrorCause[MessageSendErrorCause["NoAck"] = 2] = "NoAck";
    MessageSendErrorCause[MessageSendErrorCause["Serialization"] = 3] = "Serialization";
    MessageSendErrorCause[MessageSendErrorCause["Transport"] = 4] = "Transport";
    MessageSendErrorCause[MessageSendErrorCause["Promise"] = 5] = "Promise";
})(MessageSendErrorCause || (MessageSendErrorCause = {}));
var MessageSendError = /** @class */ (function (_super) {
    tslib_1.__extends(MessageSendError, _super);
    function MessageSendError(message, cause, source, data) {
        var _this = _super.call(this, message) || this;
        _this.cause = cause;
        _this.source = source;
        _this.data = data;
        return _this;
    }
    return MessageSendError;
}(Error));
export { MessageSendError };
/**
 */
var Client = /** @class */ (function (_super) {
    tslib_1.__extends(Client, _super);
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
        log('connect endpoint=', this.endpoint);
        this.emit('connecting');
        var socket = new WebSocket(this.endpoint, ['ratatoskr']);
        socket.onopen = function (evt) {
            log('connect onopen=', evt);
            _this._wsBind(socket);
        };
        socket.onerror = function (evt) {
            log('connect onerror=', evt);
            _this.emit('transport:error', evt);
            _this._wsDisconnect(socket, evt);
        };
        socket.onclose = function (evt) {
            log('connect onclose=', evt);
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
        log('disconnect reason=', reason);
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
            log('authentication ack=', ack);
            _this.status = ConnectionStatus.Authenticated;
            _this.emit('authenticated', ack);
        }, function (err) {
            log('authentication error=', err);
            _this.emit('protocol:error', err);
            _this._wsDisconnect(_this._socket, err);
        });
    };
    Client.prototype._wsInboundError = function (message) {
        if (message.code === 'auth_failed') {
            log('authentication failure=', message);
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
            log('receive=', message);
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
        log('send=', message);
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
            log('send err=', err);
            this.emit('transport:error', err);
            return Promise.reject(new MessageSendError('An error occurred in the transport.', MessageSendErrorCause.Transport, err, message));
        }
        if (message.id) {
            var id_1 = message.id;
            var ctx_1 = this._needsAck[id_1] = { id: id_1 };
            var promise = new Promise(function (ok, err) {
                ctx_1.ok = ok;
                ctx_1.error = err;
            });
            var timer_1 = setTimeout(function () {
                log('ack timeout=', timeout);
                ctx_1.error(new MessageSendError('Did not receive acknowledgement in the timeout period.', MessageSendErrorCause.NoAck, void 0, message));
            }, timeout);
            var cleanup_1 = function () {
                clearTimeout(timer_1);
                delete _this._needsAck[id_1];
            };
            return promise.then(function (ack) {
                log('ack=', ack);
                cleanup_1();
                return ack;
            }, function (err) {
                log('ack error=', err);
                cleanup_1();
                throw new MessageSendError('An error occurred during promise resolution', MessageSendErrorCause.Promise, err, message);
            });
        }
        else {
            return Promise.resolve(null);
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
export { Client };
//# sourceMappingURL=client.js.map