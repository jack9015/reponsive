const path = require('path');
const webpack = require('webpack');
const UglifyJsPlugin = require("uglifyjs-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const OptimizeCSSAssetsPlugin = require("optimize-css-assets-webpack-plugin");
const HtmlWebpackPlugin = require('html-webpack-plugin');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const WebpackMd5Hash = require('webpack-md5-hash');
module.exports = {
    entry: {
        'app': './src/app.js',
    },
    
    output: {
      //filename: './bundle.js'
      path: path.resolve(__dirname, 'dist'), //directory for output files
      filename: '[name].[chunkhash].js' //using [name] will create a bundle with same file name as source
    },
    mode: 'production',
    // mode: 'development',
    watch: true,
    plugins: [
        new MiniCssExtractPlugin({
          // Options similar to the same options in webpackOptions.output
          // both options are optional
          filename: "[name].[contenthash].css",
          chunkFilename: "[id].css"
        }),
        new HtmlWebpackPlugin({
          title: 'My App',
          template: 'index.html'
        }),
        new webpack.ProvidePlugin({ // inject ES5 modules as global vars
          $: 'jquery',
          jQuery: 'jquery',
          'window.jQuery': 'jquery',   
          Tether: 'tether'
        }),
        new WebpackMd5Hash()
      ],
      optimization: {
        minimizer: [
          new UglifyJsPlugin({
            cache: true,
            parallel: true,
            sourceMap: true // set to true if you want JS source maps
          }),
          /* new webpack.ProvidePlugin({
            $: "jQuery",  
            jQuery: "jQuery"
        }), */
          new OptimizeCSSAssetsPlugin({})
        ]
      },
    module: {
      rules: [
        {
          // Exposes jQuery for use outside Webpack build
          test: require.resolve('jquery'),
          use: [{
            loader: 'expose-loader',
            options: 'jQuery'
          },{
            loader: 'expose-loader',
            options: '$'
          }]
        },
        { 
          test: /\.jpg|png|gif|svg$/, 
          loader: "file-loader" 
      },
      {
        test: /\.css$/,
        use: [
          // { loader: "style-loader" },
          // { loader: "css-loader" },
         // { loader: MiniCssExtractPlugin.loader,
              /* options: {
                // you can specify a publicPath here
                // by default it use publicPath in webpackOptions.output
                publicPath: '../'
              } */
          //}
          MiniCssExtractPlugin.loader,
          { loader: 'css-loader', options: { minimize:true } },
                  //{ loader: 'sass-loader', options: { sourceMap: true } }
         ]
      },{
        test: /\.js$/,
        exclude: /(node_modules|bower_components)/,
        use: { 
          loader: 'babel-loader',
          options: {
            presets: ['env']
          }
        } 
      }]},
};