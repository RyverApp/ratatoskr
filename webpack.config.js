module.exports = {
    resolve: {
        extensions: ['', '.ts', '.js']
    },
    module: {
        loaders: [
            {test: /\.ts$/, loader: 'awesome-typescript-loader', query: {emitRequireType:false}}
        ]
    },
    externals: [
        {'ws': 'var WebSocket'}
    ],
    entry: {
        ratatoskr: ['./lib/main.js'],
        example: ['./example/index.js']
    },
    debug: false,
    output: {
        library: 'Ratatoskr',
        path: 'dist',
        filename: '[name].js'
    }
};
