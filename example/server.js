var WebSocketServer = require('ws').Server;

var id = 0;
var server = new WebSocketServer({
    port: 8001
});

function makeError(msg) {
    var out = {type: 'error'};
    if (msg) {
        out.message = msg;
    }
    return JSON.stringify(out);
}

function makeAck(id) {
    var out = {type: 'ack', reply_to: id};
    return JSON.stringify(out);
}

server.on('connection', function accept(conn) {
    (function(id) {
        var resource, agent;

        function tag() {
            var text = '[' + id + ']';
            if (agent) text += ' ' + agent;
            if (resource) text += ' ' + resource;
            return text;
        }

        console.log(tag(), 'new connection');

        var authenticated = false;

        conn.on('message', function(str) {
            console.log(tag(), 'raw', str);

            var msg;
            try {
                msg = JSON.parse(str);
            } catch (err) {
                conn.send(makeError(err.message));
                return;
            }

            if (!authenticated) {
                switch (msg.type) {
                    case 'auth':
                        console.log(tag(), 'authorized', authenticated = true);
                        agent = msg.agent;
                        resource = msg.resource;
                        break;
                    default:
                        conn.send(makeError('not authorized'));
                        break;
                }
            } else {
                switch (msg.type) {
                    case 'ping':
                        console.log(tag(), 'ping');
                        break;
                    case 'user_typing':
                        break;
                    case 'message':
                        break;
                    case 'presence_change':
                        break;
                }
            }

            if (msg.id) {
                conn.send(makeAck(msg.id));
            }
        });
        conn.on('close', function(code, reason) {
            console.log(tag(), 'closed', code, reason);
        });
    })(++id);
});
