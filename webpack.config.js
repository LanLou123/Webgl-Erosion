const path = require('path');

module.exports = {
  entry: path.resolve(__dirname, "src/main"),
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "bundle.js",
    publicPath: 'dist/',
  },
  module: {
    loaders: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/
      },
      {
        test: /\.glsl$/,
        loader: 'webpack-glsl-loader'
      },
    ]
  },
  resolve: {
    extensions: ['.ts', '.js' ],
  },
  devtool: 'source-map',
  devServer: {
    port: 5660,
    overlay: true,
  },
};
