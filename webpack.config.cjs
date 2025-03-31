const webpack = require('webpack');
const resolve = require('path').resolve;
const config = {
  devtool: 'inline-source-map',
  entry: __dirname + '/assets/js/gens',
  output:{
    path: resolve('./build/js'),
    filename: 'gens.min.js',
    library: 'gens',
    libraryTarget: 'umd',
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js','.jsx'],
  },
  module: {
    rules: [
      {
        test: /\.(css)$/i,
        use: ["style-loader", "css-loader"],
      },
      {
        loader: 'ts-loader',
        test: /\.(ts|tsx)$/,
        exclude: /node_modules/,
        options: {
          transpileOnly: true
        }
      }
    ],
  },
  plugins: [
    new webpack.ProvidePlugin({
      process: 'process/browser'
    })
  ],
  // mode: 'production',
  mode: 'development',
};
module.exports = config;