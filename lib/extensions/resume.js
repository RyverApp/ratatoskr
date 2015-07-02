/// <reference path="../../typings/tsd.d.ts" />
function resume(_a) {
    var _b = _a.ping, ping = _b === void 0 ? 10 * 1000 : _b;
    return function (client) {
        var pingInterval;
        function sendPing() {
            var msg = { type: 'ping', id: client.nextId() };
            client.emit('resume:ping', msg);
            client.send(msg).then(function (ack) {
                client.emit('resume:pong', ack);
            }, function () {
            });
        }
        client.on('authenticated', function () {
            pingInterval = setInterval(sendPing, ping);
        });
        client.on('disconnected', function (reason) {
            clearInterval(pingInterval), pingInterval = null;
        });
    };
}
exports.resume = resume;
