module.exports = {
    chainWebpack: config => config.optimization.minimize(false),
    outputDir: '../../server/public/',
    publicPath: './',
    devServer: {
      host: '127.0.0.1',
      https: true
    }
  }