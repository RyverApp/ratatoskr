var WebpackStrip = require('webpack-strip');

console.log('grunt', process.env);

module.exports = {
    resolve: {
        extensions: ['', '.ts', '.js']
    },
    module: {
        loaders: [
            { test: /\.js$/, loader: WebpackStrip.loader('debug', 'console.log') }
        ]
    },
    externals: [
        {'ws': 'var WebSocket'}
    ],
    entry: {
        ratatoskr: ['./lib/main.js']
    },
    debug: false,
    output: {
        library: 'Ratatoskr',
        path: 'dist',
        filename: '[name].js'
    }
};
