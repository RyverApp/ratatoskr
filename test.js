var Promise = require('es6-promise').Promise;

function two() {
    return new Promise(function(resolve, reject) {
        console.log('two');
        resolve('this is the value');
    });
}

function one() {
    return new Promise(function(resolve, reject) {
        console.log('one');
        resolve(two());
    });
}

one().then(function(val) {
    console.log('V:', val);
});

console.log(Promise.resolve(1));
