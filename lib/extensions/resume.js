/// <reference path="../../typings/tsd.d.ts" />
function resume(_a) {
    var _b = _a.ping, ping = _b === void 0 ? 10 * 1000 : _b, _c = _a.retry, retry = _c === void 0 ? 5 : _c;
    return function (client) {
        var pingTimeout;
        var resumeTimeout;
        var resumeAttempts = 0;
        function doPing() {
            var msg = {};
            client.emit('resume:ping', msg);
            client.sendPing({}).then(function (ack) {
                client.emit('resume:pong', ack);
                pingTimeout = setTimeout(function () { return doPing(); }, ping);
            }, function (err) {
                client.disconnect(new Error('pong'));
            });
        }
        function doResume() {
            resumeAttempts++;
            if (retry > -1 && resumeAttempts > retry) {
                client.emit('resume:quit');
                return;
            }
            var resumeDelay = (Math.max(0, (4 * Math.pow(resumeAttempts, 2)) - (5 * resumeAttempts) + 4)) * 1000;
            client.emit('resume', resumeDelay, resumeAttempts);
            clearTimeout(resumeTimeout), resumeTimeout = null;
            resumeTimeout = setTimeout(function () { return client.connect(); }, resumeDelay);
        }
        client.on('authenticated', function () {
            pingTimeout = setTimeout(function () { return doPing(); }, ping);
            resumeAttempts = 0;
        });
        client.on('disconnected', function (reason) {
            clearTimeout(pingTimeout), pingTimeout = null;
            if (reason === client) {
                clearTimeout(resumeTimeout), resumeTimeout = null;
                if (resumeAttempts > 0) {
                    client.emit('resume:stop');
                }
                resumeAttempts = 0;
                return;
            }
            doResume();
        });
    };
}
exports.resume = resume;
