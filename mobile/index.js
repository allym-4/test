// Patch console.error BEFORE any modules load (static imports are hoisted,
// so we use require() throughout to control evaluation order).
// @stripe/stripe-react-native calls React.forwardRef() at module eval time
// with a single-param function, triggering a React 19 warning we can't fix.
const _origErr = console.error.bind(console)
console.error = (...args) => {
  if (typeof args[0] === 'string' && args[0].includes('forwardRef render functions')) return
  _origErr(...args)
}

const { LogBox } = require('react-native')
LogBox.ignoreLogs(['forwardRef render functions accept exactly two parameters'])

const { registerRootComponent } = require('expo')
const App = require('./App').default
registerRootComponent(App)
