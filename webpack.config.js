const webpack = require('webpack');

module.exports = {
    entry: __dirname + '/src/dan2.js',
    output: {
        path: __dirname + '/build',
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
