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
        freya: ['./src/main.ts']
    },
    output: {
        path: './dist',
        filename: './[name].js'
    }
};
