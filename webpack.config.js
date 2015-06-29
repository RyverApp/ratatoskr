module.exports = {
    resolve: {
        extensions: ['', '.ts', '.js']
    },
    module: {
        loaders: [
            {test: /\.ts$/, loader: 'awesome-typescript-loader'}
        ]
    },
    entry: {
        ratatoskr: ['src/main.ts'],
        example: ['example/index.js']
    },
    output: {
        path: 'dist',
        filename: '[name].js'
    }
};
