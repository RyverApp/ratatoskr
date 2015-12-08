var es6_promise_1 = require('es6-promise');
function make() {
    var def = {};
    def.promise = new es6_promise_1.Promise(function (resolve, reject) {
        def.resolve = resolve;
        def.reject = reject;
    });
    return def;
}
exports.make = make;
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = make;
