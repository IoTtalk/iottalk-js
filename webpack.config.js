const webpack = require('webpack');

module.exports = {
  target: 'web',
  entry: __dirname + '/src/dan2.js',
  output: {
    path: __dirname + '/build-web',
    filename: 'dan2-web.js',
    library: ['dan2'],
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
