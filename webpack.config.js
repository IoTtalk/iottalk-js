module.exports = {
    entry: './src/dan2.js',
    output: {
        path: './build',
        filename: 'dan2.js'
    },
    module: {
        loaders: [{
            test: /\.js$/,
            exclude: /node_modules/,
            loader: 'babel-loader'
        }]
    }
};
