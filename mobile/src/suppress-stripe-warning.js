import { LogBox } from 'react-native'

LogBox.ignoreLogs(['forwardRef render functions'])

const _ce = console.error.bind(console)
console.error = (...args) => {
  if (typeof args[0] === 'string' && args[0].includes('forwardRef render functions')) return
  _ce(...args)
}
