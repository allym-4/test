import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

async function initNative() {
  if (window.Capacitor?.isNativePlatform()) {
    const { StatusBar, Style } = await import(/* @vite-ignore */ '@capacitor/status-bar')
    const { Keyboard } = await import(/* @vite-ignore */ '@capacitor/keyboard')
    await StatusBar.setStyle({ style: Style.Dark })
    await StatusBar.setBackgroundColor({ color: '#000000' })
    Keyboard.addListener('keyboardWillShow', () => {
      document.body.classList.add('keyboard-open')
    })
    Keyboard.addListener('keyboardWillHide', () => {
      document.body.classList.remove('keyboard-open')
    })
  }
}

initNative()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
