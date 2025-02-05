const webpack = require('webpack');
const resolve = require('path').resolve;
const config = {
  entry: __dirname + '/assets/js/gens',
  devtool: 'inline-source-map', 
  output:{
    path: resolve('./build/js'),
    filename: 'gens.min.js',
    library: 'gens',
  },
  resolve: {
    extensions: ['.js','.jsx', '.ts', '.tsx'],
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
  mode: 'development',
};
module.exports = config;