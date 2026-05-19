// Web shim for @stripe/stripe-react-native — native module not available on web
import React from 'react'

export const StripeProvider = ({ children }) => children
export const useStripe = () => ({
  initPaymentSheet: async () => ({ error: { message: 'Not available on web' } }),
  presentPaymentSheet: async () => ({ error: { message: 'Not available on web' } }),
  confirmPayment: async () => ({ error: { message: 'Not available on web' } }),
})
export const CardField = () => null
export const CardForm = () => null
export const PaymentSheet = () => null
