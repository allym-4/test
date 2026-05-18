const { LogBox } = require('react-native')
const { registerRootComponent } = require('expo')

// Patch AFTER expo/RN finish initialising (they overwrite console.error during
// their own setup). Stripe's PaymentMethodMessagingElement calls forwardRef with
// a single-param function at module-eval time — harmless but noisy in React 19.
LogBox.ignoreLogs(['forwardRef render functions'])
const _err = console.error.bind(console)
console.error = (...args) => {
  if (typeof args[0] === 'string' && args[0].includes('forwardRef render functions')) return
  _err(...args)
}

const App = require('./App').default
registerRootComponent(App)
