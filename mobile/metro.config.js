const { getDefaultConfig } = require('expo/metro-config')

const config = getDefaultConfig(__dirname)

// Shim stripe for web — it uses native modules not available in browsers
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && moduleName === '@stripe/stripe-react-native') {
    return { type: 'sourceFile', filePath: require.resolve('./src/stripe-web-shim.js') }
  }
  return context.resolveRequest(context, moduleName, platform)
}

module.exports = config
