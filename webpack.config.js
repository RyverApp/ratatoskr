var path = require('path'),
    webpack = require('webpack');

module.exports = {
    resolve: {
        extensions: ['', '.ts', '.js']
    },
    module: {
        loaders: [{
            test: /\.ts$/,
            loaders: [
                // 'webpack-strip?strip[]=debug,strip[]=console.log',
                'awesome-typescript-loader?emitRequireType=false&doTypeCheck=false'
            ]
        }]
    },
    plugins: [
    ],
    externals: [{
        'ws': 'var WebSocket'
    }],
    entry: {
        'ratatoskr': [
            './src/main.ts'
        ]
    },
    debug: false,
    output: {
        library: 'Ratatoskr',
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].js'
    }
};
