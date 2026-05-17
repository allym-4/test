import { registerRootComponent } from 'expo';

const _origError = console.error.bind(console)
console.error = (...args) => {
  if (typeof args[0] === 'string' && args[0].includes('forwardRef render functions')) return
  _origError(...args)
}

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
