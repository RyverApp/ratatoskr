import * as debug from 'debug';
var log = debug('ratatoskr:resume');
var RESUME_STEPS = [200, 1 * 1000, 5 * 1000, 10 * 1000, 30 * 1000, 60 * 1000]; // 0s, 1s, 5s, 10s, 30s, 60s
export function resume(_a) {
    var _b = _a === void 0 ? {} : _a, _c = _b.ping, ping = _c === void 0 ? 10 * 1000 : _c, _d = _b.retry, retry = _d === void 0 ? 6 : _d, _e = _b.steps, steps = _e === void 0 ? RESUME_STEPS : _e, _f = _b.jitter, jitter = _f === void 0 ? 1800 : _f;
    return function (client) {
        var prevAckAt, thisAckAt;
        var pingTimeout;
        var resumeTimeout;
        var resumeAttempts = 0;
        function doPing() {
            var msg = {};
            client.emit('resume:ping', msg);
            log('ping=', msg);
            client.sendPing().then(function (ack) {
                log('pong=', ack);
                prevAckAt = thisAckAt, thisAckAt = Date.now();
                client.emit('resume:pong', ack);
                client.emit('resume:tick', thisAckAt - prevAckAt, thisAckAt, prevAckAt);
                pingTimeout = setTimeout(function () { return doPing(); }, ping);
            }, function (err) {
                log('error=', err);
                // if the socket is closed, it will trigger a `disconnected` event, which will in turn trigger `doResume`, and then any messages
                // awaiting acknowledgement will be rejected.  In this order of events, the resume process has already begun, so we do not want to
                // disconnect here.
                if (resumeAttempts === 0) {
                    client.disconnect(new Error('pong'));
                }
            });
        }
        function doResume() {
            resumeAttempts++;
            if (retry > -1 && resumeAttempts > retry) {
                log('quit');
                client.emit('resume:quit');
                return;
            }
            var resumeDelay = steps[Math.min(resumeAttempts, steps.length) - 1];
            log('attempt=', resumeAttempts, resumeDelay);
            client.emit('resume', resumeDelay, resumeAttempts);
            clearTimeout(resumeTimeout), resumeTimeout = null;
            resumeTimeout = setTimeout(function () { return client.connect(); }, resumeDelay);
        }
        client.on('authenticated', function () {
            log('authenticated');
            prevAckAt = thisAckAt || Date.now(), thisAckAt = Date.now();
            client.emit('resume:tick', thisAckAt - prevAckAt, thisAckAt, prevAckAt);
            pingTimeout = setTimeout(function () { return doPing(); }, ping);
            resumeAttempts = 0;
        });
        client.on('disconnected', function (reason) {
            log('disconnected reason=', reason);
            clearTimeout(pingTimeout), pingTimeout = null;
            if (reason === client) {
                log('stop');
                // disconnect was called directly, do not resume, cancel outstanding
                clearTimeout(resumeTimeout), resumeTimeout = null;
                if (resumeAttempts > 0) {
                    client.emit('resume:stop');
                }
                resumeAttempts = 0;
                return;
            }
            if (jitter > 0 && resumeAttempts === 0) {
                var randomized = jitter * Math.random();
                log('jitter first resume attempt=', randomized);
                setTimeout(function () { return doResume(); }, randomized);
            }
            else {
                doResume();
            }
        });
    };
}
//# sourceMappingURL=resume.js.map