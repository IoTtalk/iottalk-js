const webpack = require('webpack');

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
    },
    plugins: [
        new webpack.optimize.UglifyJsPlugin({
            compress: { warnings: false, },
            output: { comments: false, },
        }),
    ]
};
