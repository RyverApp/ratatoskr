var WebpackStrip = require('webpack-strip');

module.exports = function(grunt) {
    return {
        resolve: {
            extensions: ['', '.ts', '.js']
        },
        module: {
            loaders: (grunt.option('no-trace')) ? [
                { test: /\.js$/, loader: WebpackStrip.loader('debug', 'console.log') }
            ] : []
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
};
