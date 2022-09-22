const path = require('path');
const TerserPlugin = require("terser-webpack-plugin");

module.exports = {
  mode: 'production',
  context: path.resolve(__dirname, 'src'),
  entry: {
    environment: './environment.ts'
  },
  devtool: 'source-map',
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: [{loader: 'ts-loader', options: {
            configFile: "tsconfig.prod.json"
          }}],
        exclude: [ /node_modules/ ],
      },
    ],
  },
  resolve: {
    extensions: ['.ts']
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
    libraryTarget: 'commonjs',
  }
}
