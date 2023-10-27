const path = require('path')
const fs = require('fs')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const CopyPlugin = require('copy-webpack-plugin')

const Args = {
  Production: 'production',
  Stats: '--stats',
}

const Paths = {
  Index: path.join(__dirname, 'src', 'index.ts'),
  Styles: path.join(__dirname, 'src', 'index.scss'),
  Output: path.join(__dirname, 'dist'),
}

const modes = {
  production: 'production',
  development: 'development',
}

let mode = modes.development

if (process.argv.includes(Args.Production)) {
  mode = modes.production
  process.env.NODE_ENV = modes.production
}

if (fs.existsSync(Paths.Output)) {
  fs.rmSync(Paths.Output, { recursive: true })
}

fs.mkdirSync(Paths.Output)

fs.cpSync(path.join(__dirname, './node_modules/pdfjs-dist/build/pdf.worker.min.js'), path.join(Paths.Output, 'pdfjs.worker.min.js'), { recursive: true })
fs.cpSync(path.join(__dirname, './node_modules/pdfjs-dist/build/pdf.min.js'), path.join(Paths.Output, 'pdfjs.min.js'), { recursive: true })

const config = {
  mode,
  devtool: false,
  entry:  {
    index: [Paths.Styles, Paths.Index],
  },
  output: {
    filename: '[name].js',
    path: Paths.Output,
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader'
      },
      {
        test: /\.s[ac]ss$/i,
        use: [
          MiniCssExtractPlugin.loader,
          'css-loader',
          'sass-loader',
        ],
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      minify: false,
      filename: 'index.html',
      template: 'src/index.html',
      inject:'head',
    }),
    {
      apply(compiler) {
        compiler.hooks.compilation.tap('ScriptAttributeInjector', (compilation) => 
          (HtmlWebpackPlugin).getHooks(compilation).alterAssetTags.tapAsync(
            'ScriptAttributeInjector', (data, cb) => {
              data.assetTags.scripts = data.assetTags.scripts
                .map(asset => {
                  asset.attributes.type = 'module'
                  return asset
                })
              return cb(null, data);
            }
          )
        )
      },
    },
    new CopyPlugin({
      patterns: [
        { from: 'src/robots.txt', to: '' },
      ]
    }),
    new MiniCssExtractPlugin({ 
      filename: '[name].[chunkhash].css',
    })
  ],
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    mainFields: ['module', 'main'],
    alias: {}
  }
}

if (mode === modes.production) {
  config.output.filename = '[name].[chunkhash].js'
}

module.exports = config
