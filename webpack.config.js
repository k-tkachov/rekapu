const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  mode: 'development',
  devtool: 'cheap-module-source-map',
  entry: {
    popup: './src/popup/index.tsx',
    background: './src/background/background.ts',
    contentScript: './src/content/contentScript.ts',
    dashboard: './src/dashboard/index.tsx', // New entry point
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              configFile: 'tsconfig.json',
            },
          },
        ],
        exclude: [/node_modules/, /website/],
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.json$/,
        type: 'json',
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    fallback: {
      "fs": false,
      "path": false,
      "crypto": false
    }
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        { from: 'src/manifest.json', to: 'manifest.json' },
        { from: 'src/blocked.html', to: 'blocked.html' },
        { from: 'src/blocked.js', to: 'blocked.js' },
        { from: 'src/dashboard.html', to: 'dashboard.html' }, // Copy the HTML file
        { from: 'src/_locales/', to: '_locales/', noErrorOnMissing: false }, // Copy i18n locales
        { from: 'src/vendor/marked.js', to: 'vendor/marked.js' }, // Copy marked.js
        { from: 'src/styles/', to: 'styles/', noErrorOnMissing: true }, // Copy styles
        { from: 'src/vendor/', to: 'vendor/', noErrorOnMissing: true }, // Copy vendor libraries without processing
        { from: 'src/icons/', to: 'icons/', noErrorOnMissing: false }, // Copy extension icons
      ],
    }),
    new HtmlWebpackPlugin({
      template: './src/popup/popup.html',
      filename: 'popup.html',
      chunks: ['popup'],
    }),
  ],
}; 