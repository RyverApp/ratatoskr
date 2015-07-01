var ws = require('nodejs-websocket');

var id = 0;
var server = ws.createServer(function accept(conn) {
    (function(id) {
        console.log(id, 'new connection');
        conn.on('text', function(str) {
            console.log(id, 'text', str);
        });
        conn.on('close', function(code, reason) {
            console.log(id, 'closed', code, reason);
        });
    })(++id);
}).listen(8001);
