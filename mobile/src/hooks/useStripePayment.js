import { useCallback } from 'react'
import { usePaymentSheet } from '@stripe/stripe-react-native'
import { payments, enrolments } from '../api'

export function useStripePayment() {
  const { initPaymentSheet, presentPaymentSheet } = usePaymentSheet()

  const pay = useCallback(async ({ amountCents, description, sessionId, enrolmentType, onSuccess }) => {
    // 1 — create payment intent on backend
    const intentRes = await payments.stripe.createPaymentIntent({
      amount: amountCents,
      description,
      session_id: sessionId,
      enrolment_type: enrolmentType,
    })
    const { client_secret, customer, ephemeral_key } = intentRes.data

    // 2 — initialise payment sheet (Apple Pay / Google Pay shown automatically)
    const { error: initError } = await initPaymentSheet({
      paymentIntentClientSecret: client_secret,
      customerEphemeralKeySecret: ephemeral_key,
      customerId: customer,
      merchantDisplayName: 'Your Studio',
      applePay: { merchantCountryCode: 'AU' },
      googlePay: { merchantCountryCode: 'AU', testEnv: false },
      defaultBillingDetails: { address: { country: 'AU' } },
      allowsDelayedPaymentMethods: false,
    })
    if (initError) throw new Error(initError.message)

    // 3 — present the sheet
    const { error: presentError } = await presentPaymentSheet()
    if (presentError) {
      if (presentError.code === 'Canceled') return false
      throw new Error(presentError.message)
    }

    // 4 — payment succeeded — create enrolment (skip if no sessionId; caller handles it)
    if (sessionId) {
      await enrolments.create({ session: sessionId, status: 'active', enrolment_type: enrolmentType })
    }
    if (onSuccess) onSuccess()
    return true
  }, [initPaymentSheet, presentPaymentSheet])

  return { pay }
}
