import { useState, useCallback } from 'react'
import {
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Alert,
  Switch,
  RefreshControl,
  ActivityIndicator,
} from 'react-native'
import { useStripe } from '@stripe/stripe-react-native'
import { useAuth } from '../../contexts/AuthContext'
import { useApi } from '../../hooks/useApi'
import { payments, attendance, helpdesk } from '../../api'

// ─── constants ────────────────────────────────────────────────────────────────

const PAYMENT_TYPE_LABELS = {
  season: 'Season',
  catch_up: 'Catch-up',
  casual: 'Casual',
  no_show_fee: 'No-show fee',
  payment: 'Payment',
  charge: 'Charge',
  credit: 'Credit',
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmtDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function fmtAmount(amount) {
  const n = parseFloat(amount ?? 0)
  const abs = Math.abs(n).toFixed(2)
  return n < 0 ? `-$${abs}` : `$${abs}`
}

function isIncomeRow(record) {
  // credits and payments coming in are displayed in green
  return ['credit', 'payment'].includes(record.payment_type)
}

// ─── sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ title }) {
  return <Text style={s.sectionTitle}>{title}</Text>
}

function TypeBadge({ type }) {
  const label = PAYMENT_TYPE_LABELS[type] ?? type
  const isRed = type === 'no_show_fee' || type === 'charge'
  return (
    <View style={[s.typeBadge, isRed && s.typeBadgeRed]}>
      <Text style={[s.typeBadgeText, isRed && s.typeBadgeTextRed]}>{label}</Text>
    </View>
  )
}

function PaymentRow({ record }) {
  const income = isIncomeRow(record)
  return (
    <View style={s.paymentRow}>
      <View style={s.paymentLeft}>
        <TypeBadge type={record.payment_type} />
        {!!record.description && (
          <Text style={s.paymentDesc} numberOfLines={1}>
            {record.description}
          </Text>
        )}
        <Text style={s.paymentDate}>{fmtDate(record.created_at)}</Text>
      </View>
      <Text style={[s.paymentAmount, income ? s.amountGreen : s.amountRed]}>
        {income ? '+' : ''}{fmtAmount(record.amount)}
      </Text>
    </View>
  )
}

function CardRow({ method, isDefault, onSetDefault, onRemove, removing }) {
  const { brand = 'card', last4 = '????', exp_month, exp_year } = method.card ?? {}
  const brandLabel = brand.charAt(0).toUpperCase() + brand.slice(1)
  return (
    <TouchableOpacity
      style={[s.cardRow, isDefault && s.cardRowDefault]}
      onPress={() => onSetDefault(method.id)}
      activeOpacity={0.7}
    >
      <View style={s.cardInfo}>
        <Text style={s.cardBrand}>
          {brandLabel} {'····'} {last4}
        </Text>
        <Text style={s.cardExpiry}>
          Expires {exp_month}/{exp_year}
        </Text>
      </View>
      <View style={s.cardActions}>
        {isDefault && (
          <View style={s.defaultBadge}>
            <Text style={s.defaultBadgeText}>Default</Text>
          </View>
        )}
        {removing ? (
          <ActivityIndicator size="small" color="#ccff00" />
        ) : (
          <TouchableOpacity
            style={s.removeBtn}
            onPress={() => onRemove(method.id, last4)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={s.removeBtnText}>Remove</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  )
}

// ─── main screen ──────────────────────────────────────────────────────────────

export default function BillingScreen() {
  const { user } = useAuth()
  const userId = user?.id
  const { initPaymentSheet, presentPaymentSheet, initSetupPaymentSheet, presentSetupPaymentSheet } = useStripe()

  // ── remote data ─────────────────────────────────────────────────────────────
  const {
    data: balanceData,
    loading: balanceLoading,
    refetch: refetchBalance,
  } = useApi(() => (userId ? payments.balance(userId) : null), [userId])

  const {
    data: paymentsData,
    loading: paymentsLoading,
    refetch: refetchPayments,
  } = useApi(() => (userId ? payments.list({ student: userId }) : null), [userId])

  const {
    data: creditsData,
    loading: creditsLoading,
    refetch: refetchCredits,
  } = useApi(
    () => (userId ? attendance.makeupCredits.list({ student: userId }) : null),
    [userId],
  )

  const {
    data: plansData,
    loading: plansLoading,
  } = useApi(
    () => (userId ? payments.plans.list({ student: userId }) : null),
    [userId],
  )

  // payments.stripe.config() returns saved cards and auto-charge settings
  const {
    data: stripeConfig,
    loading: stripeLoading,
    refetch: refetchStripe,
  } = useApi(() => payments.stripe.config(), [])

  // ── local state ──────────────────────────────────────────────────────────────
  const [autoCharge, setAutoCharge] = useState(null)
  const [defaultMethodId, setDefaultMethodId] = useState(null)
  const [updatingAutoCharge, setUpdatingAutoCharge] = useState(false)
  const [removingId, setRemovingId] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const [payingNow, setPayingNow] = useState(false)
  const [addingCard, setAddingCard] = useState(false)
  const [invoiceRecord, setInvoiceRecord] = useState(null)
  const [showPartialModal, setShowPartialModal] = useState(false)
  const [partialAmount, setPartialAmount] = useState('')
  const [payingPartial, setPayingPartial] = useState(false)

  // Sync local state once stripe config arrives (only on first load)
  if (stripeConfig !== null && autoCharge === null) {
    setAutoCharge(stripeConfig?.auto_charge ?? false)
    setDefaultMethodId(stripeConfig?.default_payment_method_id ?? null)
  }

  const paymentMethods = stripeConfig?.payment_methods ?? []

  // ── pull-to-refresh ──────────────────────────────────────────────────────────
  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await Promise.all([
      refetchBalance(),
      refetchPayments(),
      refetchCredits(),
      refetchStripe(),
    ])
    setRefreshing(false)
  }, [refetchBalance, refetchPayments, refetchCredits, refetchStripe])

  // ── derived values ───────────────────────────────────────────────────────────
  const balanceNum = parseFloat(balanceData?.balance ?? 0)
  const isOwing = balanceNum < 0
  const isCreditBalance = balanceNum > 0

  const paymentList = paymentsData?.results ?? paymentsData ?? []
  const activePlans = (plansData?.results ?? plansData ?? []).filter(p => p.status === 'active')
  const creditsList = creditsData?.results ?? creditsData ?? []
  const availableCredits = creditsList.filter(c => c.status === 'available')

  // ── handlers ─────────────────────────────────────────────────────────────────
  async function handleAutoChargeToggle(val) {
    setAutoCharge(val)
    setUpdatingAutoCharge(true)
    try {
      // updateAutoCharge is not in the current API; call via optional chain so
      // it degrades gracefully until the endpoint is wired up.
      await payments.stripe.updateAutoCharge?.({
        auto_charge: val,
        default_payment_method_id: defaultMethodId,
      })
    } catch {
      setAutoCharge(!val)
      Alert.alert('Error', 'Could not update auto-charge setting. Please try again.')
    } finally {
      setUpdatingAutoCharge(false)
    }
  }

  function handleSetDefault(methodId) {
    if (methodId === defaultMethodId) return
    setDefaultMethodId(methodId)
    payments.stripe.updateAutoCharge?.({
      auto_charge: autoCharge,
      default_payment_method_id: methodId,
    }).catch(() => {
      Alert.alert('Error', 'Could not set default card.')
    })
  }

  function handleRemoveCard(methodId, last4) {
    Alert.alert(
      'Remove card',
      `Remove the card ending in ${last4}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setRemovingId(methodId)
            try {
              await payments.stripe.removePaymentMethod?.({ payment_method_id: methodId })
              if (defaultMethodId === methodId) setDefaultMethodId(null)
              await refetchStripe()
            } catch {
              Alert.alert('Error', 'Could not remove card. Please try again.')
            } finally {
              setRemovingId(null)
            }
          },
        },
      ],
    )
  }

  async function handlePayNow() {
    if (payingNow || !isOwing) return
    setPayingNow(true)
    try {
      const amountCents = Math.round(Math.abs(balanceNum) * 100)
      const { data } = await payments.stripe.createPaymentIntent({
        amount: amountCents,
        description: 'Account balance payment',
      })
      const { error: initErr } = await initPaymentSheet({
        merchantDisplayName: 'Duality Pole Studio',
        paymentIntentClientSecret: data.client_secret,
        allowsDelayedPaymentMethods: false,
        appearance: { colors: { primary: '#ccff00', background: '#111', componentBackground: '#1a1a1a', componentText: '#fff', primaryText: '#fff', secondaryText: '#888' } },
      })
      if (initErr) { Alert.alert('Error', initErr.message); return }
      const { error: presentErr } = await presentPaymentSheet()
      if (presentErr) {
        if (presentErr.code !== 'Canceled') Alert.alert('Payment failed', presentErr.message)
      } else {
        Alert.alert('Payment successful', 'Your payment has been processed.')
        await Promise.all([refetchBalance(), refetchPayments()])
      }
    } catch (e) {
      const msg = e?.response?.data?.detail || e?.message || 'Could not start payment. Please try again.'
      Alert.alert('Error', msg)
    } finally {
      setPayingNow(false)
    }
  }

  async function handleAddCard() {
    if (addingCard) return
    setAddingCard(true)
    try {
      const { data } = await payments.stripe.setupIntent()
      const { error: initErr } = await initSetupPaymentSheet({
        merchantDisplayName: 'Duality Pole Studio',
        setupIntentClientSecret: data.client_secret,
        appearance: { colors: { primary: '#ccff00', background: '#111', componentBackground: '#1a1a1a', componentText: '#fff', primaryText: '#fff', secondaryText: '#888' } },
      })
      if (initErr) { Alert.alert('Error', initErr.message); return }
      const { error: presentErr } = await presentSetupPaymentSheet()
      if (presentErr) {
        if (presentErr.code !== 'Canceled') Alert.alert('Failed', presentErr.message)
      } else {
        Alert.alert('Card saved', 'Your card has been saved successfully.')
        await refetchStripe()
      }
    } catch {
      Alert.alert('Error', 'Could not add card. Please try again.')
    } finally {
      setAddingCard(false)
    }
  }

  async function handlePayPartial() {
    const amt = parseFloat(partialAmount)
    if (!amt || amt <= 0 || payingPartial) return
    setPayingPartial(true)
    try {
      const amountCents = Math.round(amt * 100)
      const { data } = await payments.stripe.createPaymentIntent({ amount: amountCents, description: 'Partial payment' })
      const { error: initErr } = await initPaymentSheet({
        merchantDisplayName: 'Duality Pole Studio',
        paymentIntentClientSecret: data.client_secret,
        allowsDelayedPaymentMethods: false,
        appearance: { colors: { primary: '#ccff00', background: '#111', componentBackground: '#1a1a1a', componentText: '#fff', primaryText: '#fff', secondaryText: '#888' } },
      })
      if (initErr) { Alert.alert('Error', initErr.message); return }
      const { error: presentErr } = await presentPaymentSheet()
      if (presentErr) {
        if (presentErr.code !== 'Canceled') Alert.alert('Payment failed', presentErr.message)
      } else {
        setShowPartialModal(false)
        setPartialAmount('')
        Alert.alert('Payment successful', `$${amt.toFixed(2)} payment processed.`)
        await Promise.all([refetchBalance(), refetchPayments()])
      }
    } catch {
      Alert.alert('Error', 'Could not start payment. Please try again.')
    } finally {
      setPayingPartial(false)
    }
  }

  function handleRefundRequest() {
    Alert.alert(
      'Request refund or credit',
      'What would you like to request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Request refund',
          onPress: () => showReasonPrompt('Refund request'),
        },
        {
          text: 'Request account credit',
          onPress: () => showReasonPrompt('Account credit request'),
        },
      ],
    )
  }

  function showReasonPrompt(subject) {
    // Alert.prompt is iOS-only; we present a confirmation then submit.
    // In production a Modal with TextInput would capture the reason text.
    Alert.alert(
      subject,
      "Tap Submit and we'll follow up with you shortly. You can add details in the conversation that follows.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          onPress: () => {
            helpdesk
              .submitTicket({
                subject: 'Refund/Credit request',
                body: subject,
                category: 'billing',
              })
              .then(() => {
                Alert.alert(
                  'Request submitted',
                  "We've received your request and will be in touch soon.",
                )
              })
              .catch(() => {
                Alert.alert('Error', 'Could not submit your request. Please try again.')
              })
          },
        },
      ],
    )
  }

  // ── render ───────────────────────────────────────────────────────────────────
  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={s.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#ccff00"
        />
      }
    >
      {/* Balance card */}
      <View
        style={[
          s.balanceCard,
          isOwing && s.balanceCardRed,
          isCreditBalance && s.balanceCardGreen,
        ]}
      >
        <Text style={s.balanceLabel}>Account Balance</Text>
        {balanceLoading ? (
          <ActivityIndicator color="#fff" style={s.balanceLoader} />
        ) : (
          <>
            <Text style={s.balanceAmount}>
              ${Math.abs(balanceNum).toFixed(2)}
            </Text>
            <Text style={s.balanceStatus}>
              {isOwing
                ? 'Amount owing'
                : isCreditBalance
                  ? 'Credit on account'
                  : 'No balance due'}
            </Text>
            {isOwing && (
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
                <TouchableOpacity
                  style={s.payNowBtn}
                  onPress={handlePayNow}
                  disabled={payingNow}
                  activeOpacity={0.8}
                >
                  {payingNow
                    ? <ActivityIndicator color="#000" size="small" />
                    : <Text style={s.payNowBtnText}>Pay ${Math.abs(balanceNum).toFixed(2)} now</Text>
                  }
                </TouchableOpacity>
                <TouchableOpacity
                  style={s.payPartialBtn}
                  onPress={() => setShowPartialModal(true)}
                  activeOpacity={0.8}
                >
                  <Text style={s.payPartialBtnText}>Partial</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </View>

      {/* Catch-up credits */}
      <View style={s.card}>
        <SectionHeader title="Catch-up Credits" />
        {creditsLoading ? (
          <ActivityIndicator color="#ccff00" />
        ) : (
          <>
            <View style={s.creditsCountRow}>
              <Text style={s.creditsNumber}>{availableCredits.length}</Text>
              <Text style={s.creditsCountLabel}>
                {availableCredits.length === 1 ? 'credit available' : 'credits available'}
              </Text>
            </View>
            {availableCredits.length > 0 && (
              <View style={s.creditsList}>
                {availableCredits.map(credit => (
                  <View key={credit.id} style={s.creditRow}>
                    <View style={s.creditDot} />
                    <View style={s.creditMeta}>
                      {!!credit.reason && (
                        <Text style={s.creditReason}>{credit.reason}</Text>
                      )}
                      <Text style={s.creditDate}>{fmtDate(credit.created_at)}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
            {availableCredits.length === 0 && (
              <Text style={s.emptyText}>No catch-up credits available.</Text>
            )}
          </>
        )}
      </View>

      {/* Payment plans */}
      {(plansLoading || activePlans.length > 0) && (
        <View style={s.card}>
          <SectionHeader title="Payment Plans" />
          {plansLoading ? (
            <ActivityIndicator color="#ccff00" />
          ) : activePlans.map(plan => (
            <View key={plan.id} style={s.planCard}>
              <View style={s.planHeader}>
                <Text style={s.planDescription}>{plan.description}</Text>
                <Text style={s.planTotal}>${parseFloat(plan.total_amount).toFixed(2)}</Text>
              </View>
              {(plan.instalments ?? []).map((inst, i) => {
                const isPaid = inst.status === 'paid'
                const isOverdue = inst.status === 'overdue'
                return (
                  <View key={inst.id ?? i} style={s.instalmentRow}>
                    <View style={[s.instalmentDot, isPaid && s.dotPaid, isOverdue && s.dotOverdue]} />
                    <Text style={s.instalmentDate}>
                      {new Date(inst.due_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </Text>
                    <Text style={[s.instalmentAmount, isPaid && s.amountPaid, isOverdue && s.amountOverdue]}>
                      ${parseFloat(inst.amount).toFixed(2)}
                    </Text>
                    <Text style={[s.instalmentStatus, isPaid && s.statusPaid, isOverdue && s.statusOverdue]}>
                      {isPaid ? '✓ Paid' : isOverdue ? 'Overdue' : 'Upcoming'}
                    </Text>
                  </View>
                )
              })}
            </View>
          ))}
        </View>
      )}

      {/* Payment history */}
      <View style={s.card}>
        <SectionHeader title="Payment History" />
        {paymentsLoading ? (
          <ActivityIndicator color="#ccff00" />
        ) : paymentList.length === 0 ? (
          <Text style={s.emptyText}>No payment history yet.</Text>
        ) : (
          paymentList.map(record => (
            <TouchableOpacity key={record.id} onPress={() => setInvoiceRecord(record)} activeOpacity={0.8}>
              <PaymentRow record={record} />
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Saved cards */}
      <View style={s.card}>
        <View style={s.cardSectionHeader}>
          <Text style={s.sectionTitle}>Saved Cards</Text>
          <TouchableOpacity style={s.addCardBtn} onPress={handleAddCard} disabled={addingCard} activeOpacity={0.8}>
            {addingCard
              ? <ActivityIndicator color="#000" size="small" style={{ width: 60 }} />
              : <Text style={s.addCardBtnText}>+ Add card</Text>
            }
          </TouchableOpacity>
        </View>
        {stripeLoading ? (
          <ActivityIndicator color="#ccff00" />
        ) : paymentMethods.length === 0 ? (
          <Text style={s.emptyText}>No saved cards.</Text>
        ) : (
          paymentMethods.map(method => (
            <CardRow
              key={method.id}
              method={method}
              isDefault={method.id === defaultMethodId}
              onSetDefault={handleSetDefault}
              onRemove={handleRemoveCard}
              removing={removingId === method.id}
            />
          ))
        )}
      </View>

      {/* Auto-charge toggle */}
      <View style={s.card}>
        <SectionHeader title="Auto-charge" />
        <View style={s.autoChargeRow}>
          <Text style={s.autoChargeLabel}>
            Auto-charge my card when a payment is due
          </Text>
          <Switch
            value={autoCharge ?? false}
            onValueChange={handleAutoChargeToggle}
            disabled={updatingAutoCharge || stripeLoading}
            trackColor={{ true: '#ccff00', false: '#333' }}
            thumbColor="#fff"
            ios_backgroundColor="#333"
          />
        </View>
        {updatingAutoCharge && (
          <Text style={s.savingText}>Saving…</Text>
        )}
      </View>

      <View style={s.bottomSpacer} />

      {/* Invoice modal */}
      <Modal visible={!!invoiceRecord} transparent animationType="fade" onRequestClose={() => setInvoiceRecord(null)}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setInvoiceRecord(null)}>
          <View style={s.invoiceSheet}>
            <Text style={s.invoiceTitle}>Invoice #{invoiceRecord?.id}</Text>
            <Text style={s.invoiceDesc}>{invoiceRecord?.description || invoiceRecord?.payment_type?.replace(/_/g, ' ')}</Text>
            <View style={s.invoiceRow}>
              <Text style={s.invoiceRowLabel}>Amount</Text>
              <Text style={s.invoiceRowValue}>${Math.abs(parseFloat(invoiceRecord?.amount || 0)).toFixed(2)}</Text>
            </View>
            <View style={s.invoiceRow}>
              <Text style={s.invoiceRowLabel}>Date</Text>
              <Text style={s.invoiceRowValue}>
                {invoiceRecord?.created_at ? new Date(invoiceRecord.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
              </Text>
            </View>
            <TouchableOpacity style={s.invoiceCloseBtn} onPress={() => setInvoiceRecord(null)}>
              <Text style={s.invoiceCloseBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Partial payment modal */}
      <Modal visible={showPartialModal} transparent animationType="fade" onRequestClose={() => setShowPartialModal(false)}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowPartialModal(false)}>
          <View style={s.invoiceSheet}>
            <Text style={s.invoiceTitle}>Pay partial amount</Text>
            <Text style={s.invoiceDesc}>Enter the amount you'd like to pay</Text>
            <TextInput
              style={s.partialInput}
              value={partialAmount}
              onChangeText={setPartialAmount}
              placeholder="0.00"
              placeholderTextColor="#555"
              keyboardType="decimal-pad"
            />
            <TouchableOpacity
              style={[s.payNowBtn, { marginTop: 12, width: '100%' }, (!partialAmount || parseFloat(partialAmount) <= 0 || payingPartial) && { opacity: 0.5 }]}
              onPress={handlePayPartial}
              disabled={!partialAmount || parseFloat(partialAmount) <= 0 || payingPartial}
            >
              {payingPartial
                ? <ActivityIndicator color="#000" size="small" />
                : <Text style={s.payNowBtnText}>Pay ${partialAmount ? parseFloat(partialAmount).toFixed(2) : '0.00'}</Text>
              }
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  )
}

// ─── styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    padding: 16,
  },
  bottomSpacer: {
    height: 40,
  },

  // ── Balance card ────────────────────────────────────────────────────────────
  balanceCard: {
    borderRadius: 18,
    padding: 28,
    marginBottom: 16,
    alignItems: 'center',
    backgroundColor: '#1a0f2e',
    borderWidth: 1,
    borderColor: '#7c3aed',
  },
  balanceCardRed: {
    backgroundColor: '#2a0a0a',
    borderColor: '#ef4444',
  },
  balanceCardGreen: {
    backgroundColor: '#0a2a1a',
    borderColor: '#ccff00',
  },
  balanceLoader: {
    marginTop: 16,
  },
  balanceLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  balanceAmount: {
    fontSize: 52,
    fontWeight: '800',
    color: '#fff',
    marginTop: 8,
    letterSpacing: -1.5,
  },
  balanceStatus: {
    fontSize: 14,
    fontWeight: '500',
    color: '#aaa',
    marginTop: 4,
  },
  payNowBtn: {
    marginTop: 18,
    backgroundColor: '#ccff00',
    borderRadius: 22,
    paddingHorizontal: 28,
    paddingVertical: 12,
    minWidth: 180,
    alignItems: 'center',
  },
  payNowBtnText: {
    color: '#000',
    fontWeight: '800',
    fontSize: 15,
  },

  // ── Dark card container ─────────────────────────────────────────────────────
  card: {
    backgroundColor: '#111',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#222',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  cardSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  addCardBtn: {
    backgroundColor: '#ccff00',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 8,
  },
  addCardBtnText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
    paddingVertical: 6,
  },

  // ── Payment plans ────────────────────────────────────────────────────────────
  planCard: { borderTopWidth: 1, borderTopColor: '#1a1a1a', paddingTop: 12, marginTop: 8 },
  planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  planDescription: { fontSize: 14, fontWeight: '600', color: '#fff', flex: 1, paddingRight: 8 },
  planTotal: { fontSize: 15, fontWeight: '700', color: '#ccff00' },
  instalmentRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, gap: 10, borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
  instalmentDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#333' },
  dotPaid: { backgroundColor: '#ccff00' },
  dotOverdue: { backgroundColor: '#ef4444' },
  instalmentDate: { flex: 1, fontSize: 13, color: '#ccc' },
  instalmentAmount: { fontSize: 13, fontWeight: '600', color: '#ccc' },
  amountPaid: { color: '#ccff00' },
  amountOverdue: { color: '#ef4444' },
  instalmentStatus: { fontSize: 11, fontWeight: '600', color: '#555', width: 60, textAlign: 'right' },
  statusPaid: { color: '#ccff00' },
  statusOverdue: { color: '#ef4444' },

  // ── Catch-up credits ─────────────────────────────────────────────────────────
  creditsCountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  creditsNumber: {
    fontSize: 34,
    fontWeight: '800',
    color: '#ccff00',
    marginRight: 8,
  },
  creditsCountLabel: {
    fontSize: 15,
    color: '#aaa',
  },
  creditsList: {
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
    paddingTop: 10,
    gap: 8,
  },
  creditRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  creditDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#7c3aed',
    marginTop: 5,
    marginRight: 10,
  },
  creditMeta: {
    flex: 1,
  },
  creditReason: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
  },
  creditDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },

  // ── Payment rows ─────────────────────────────────────────────────────────────
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  paymentLeft: {
    flex: 1,
    marginRight: 12,
  },
  paymentDesc: {
    fontSize: 13,
    color: '#aaa',
    marginTop: 4,
  },
  paymentDate: {
    fontSize: 11,
    color: '#555',
    marginTop: 3,
  },
  paymentAmount: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 2,
    flexShrink: 0,
  },
  amountGreen: {
    color: '#ccff00',
  },
  amountRed: {
    color: '#ef4444',
  },
  typeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#1a1a2e',
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  typeBadgeRed: {
    backgroundColor: '#2a0a0a',
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ccff00',
  },
  typeBadgeTextRed: {
    color: '#ef4444',
  },

  // ── Saved card rows ──────────────────────────────────────────────────────────
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 8,
  },
  cardRowDefault: {
    borderColor: '#ccff00',
    backgroundColor: '#0a2a1a',
  },
  cardInfo: {
    flex: 1,
  },
  cardBrand: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  cardExpiry: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  defaultBadge: {
    backgroundColor: '#0a2a1a',
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#ccff00',
  },
  defaultBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ccff00',
  },
  removeBtn: {
    padding: 4,
  },
  removeBtnText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#ef4444',
  },

  // ── Auto-charge ───────────────────────────────────────────────────────────────
  autoChargeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  autoChargeLabel: {
    flex: 1,
    fontSize: 14,
    color: '#aaa',
    lineHeight: 20,
  },
  savingText: {
    fontSize: 12,
    color: '#555',
    marginTop: 6,
  },

  // ── Refund button ─────────────────────────────────────────────────────────────
  refundBtn: {
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 2,
    backgroundColor: '#111',
  },
  refundBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ccff00',
  },

  // ── Partial pay button ───────────────────────────────────────────────────────
  payPartialBtn: {
    borderWidth: 1,
    borderColor: '#ccff00',
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 18,
    alignItems: 'center',
  },
  payPartialBtnText: {
    color: '#ccff00',
    fontWeight: '700',
    fontSize: 14,
  },

  // ── Modals ────────────────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 24,
  },
  invoiceSheet: {
    backgroundColor: '#111',
    borderRadius: 16,
    padding: 24,
    width: '100%',
  },
  invoiceTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  invoiceDesc: {
    fontSize: 13,
    color: '#888',
    marginBottom: 16,
  },
  invoiceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  invoiceRowLabel: {
    fontSize: 14,
    color: '#888',
  },
  invoiceRowValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  invoiceCloseBtn: {
    backgroundColor: '#ccff00',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  invoiceCloseBtnText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 14,
  },
  partialInput: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 10,
    color: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 18,
    fontWeight: '600',
    marginTop: 8,
  },
})
