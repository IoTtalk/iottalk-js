const webpack = require('webpack');

module.exports = [
  {
    mode: 'none',
    target: 'web',
    entry: __dirname + '/src/index.js',
    output: {
      path: __dirname + '/build-web',
      filename: 'iottalkjs-web.js',
      library: 'iottalkjs',
      libraryTarget: 'window',
    },
    module: {
      rules: [
        {
          test: /\.m?js$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
          }
        },
      ]
    }
  }
]
