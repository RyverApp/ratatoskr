var path = require('path'),
    webpack = require('webpack'),
    _ = require('lodash');

var common = {
    resolve: {
        extensions: ['', '.ts', '.js']
    },
    module: {
        loaders: [{
            test: /\.ts$/,
            loaders: [
                /*'webpack-strip?strip[]=debug,strip[]=console.log',*/
                'ts'
            ]
        }]
    },    
    plugins: [],
    externals: [{
        'ws': 'var WebSocket'
    }],
    entry: {
        'ratatoskr': [
            './src/main.ts'
        ]
    },    
    output: {
        library: 'Ratatoskr',
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].js'
    }
};

module.exports = [
    _.merge({}, common),
    _.merge({}, common, {
        plugins: [
            new webpack.DefinePlugin({
                'process.env': {
                    'NODE_ENV': '"production"'
                }
            }),
            new webpack.optimize.UglifyJsPlugin({
                compress: {
                    warnings: false
                },
                output: {
                    comments: false
                }
            })
        ],
        output: {
            filename: '[name].min.js'
        }
    })
];
