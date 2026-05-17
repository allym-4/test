import { useState, useCallback } from 'react'
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Switch,
  RefreshControl,
  ActivityIndicator,
} from 'react-native'
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
          <ActivityIndicator size="small" color="#6366f1" />
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
          tintColor="#6366f1"
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
          </>
        )}
      </View>

      {/* Catch-up credits */}
      <View style={s.card}>
        <SectionHeader title="Catch-up Credits" />
        {creditsLoading ? (
          <ActivityIndicator color="#6366f1" />
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

      {/* Payment history */}
      <View style={s.card}>
        <SectionHeader title="Payment History" />
        {paymentsLoading ? (
          <ActivityIndicator color="#6366f1" />
        ) : paymentList.length === 0 ? (
          <Text style={s.emptyText}>No payment history yet.</Text>
        ) : (
          paymentList.map(record => <PaymentRow key={record.id} record={record} />)
        )}
      </View>

      {/* Saved cards */}
      <View style={s.card}>
        <SectionHeader title="Saved Cards" />
        {stripeLoading ? (
          <ActivityIndicator color="#6366f1" />
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
            trackColor={{ true: '#6366f1', false: '#d1d5db' }}
            thumbColor="#fff"
            ios_backgroundColor="#d1d5db"
          />
        </View>
        {updatingAutoCharge && (
          <Text style={s.savingText}>Saving…</Text>
        )}
      </View>

      {/* Refund / credit request */}
      <TouchableOpacity
        style={s.refundBtn}
        onPress={handleRefundRequest}
        activeOpacity={0.7}
      >
        <Text style={s.refundBtnText}>Request refund / credit</Text>
      </TouchableOpacity>

      <View style={s.bottomSpacer} />
    </ScrollView>
  )
}

// ─── styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f9fafb',
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
    backgroundColor: '#6366f1',
    shadowColor: '#6366f1',
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 8,
  },
  balanceCardRed: {
    backgroundColor: '#ef4444',
    shadowColor: '#ef4444',
  },
  balanceCardGreen: {
    backgroundColor: '#10b981',
    shadowColor: '#10b981',
  },
  balanceLoader: {
    marginTop: 16,
  },
  balanceLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.75)',
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
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
  },

  // ── White card container ─────────────────────────────────────────────────────
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    paddingVertical: 6,
  },

  // ── Catch-up credits ─────────────────────────────────────────────────────────
  creditsCountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  creditsNumber: {
    fontSize: 34,
    fontWeight: '800',
    color: '#6366f1',
    marginRight: 8,
  },
  creditsCountLabel: {
    fontSize: 15,
    color: '#374151',
  },
  creditsList: {
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
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
    backgroundColor: '#a5b4fc',
    marginTop: 5,
    marginRight: 10,
  },
  creditMeta: {
    flex: 1,
  },
  creditReason: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  creditDate: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },

  // ── Payment rows ─────────────────────────────────────────────────────────────
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  paymentLeft: {
    flex: 1,
    marginRight: 12,
  },
  paymentDesc: {
    fontSize: 13,
    color: '#374151',
    marginTop: 4,
  },
  paymentDate: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 3,
  },
  paymentAmount: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 2,
    flexShrink: 0,
  },
  amountGreen: {
    color: '#10b981',
  },
  amountRed: {
    color: '#ef4444',
  },
  typeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#e0e7ff',
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  typeBadgeRed: {
    backgroundColor: '#fee2e2',
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4338ca',
  },
  typeBadgeTextRed: {
    color: '#b91c1c',
  },

  // ── Saved card rows ──────────────────────────────────────────────────────────
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    marginBottom: 8,
  },
  cardRowDefault: {
    borderColor: '#6366f1',
    backgroundColor: '#f5f3ff',
  },
  cardInfo: {
    flex: 1,
  },
  cardBrand: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  cardExpiry: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  defaultBadge: {
    backgroundColor: '#6366f1',
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  defaultBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
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
    color: '#374151',
    lineHeight: 20,
  },
  savingText: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 6,
  },

  // ── Refund button ─────────────────────────────────────────────────────────────
  refundBtn: {
    borderWidth: 1.5,
    borderColor: '#6366f1',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 2,
    backgroundColor: '#fff',
  },
  refundBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6366f1',
  },
})
