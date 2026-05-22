import { useState } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, RefreshControl, Modal, Alert,
  ScrollView,
} from 'react-native'
import { useApi } from '../../hooks/useApi'
import { leads as leadsApi } from '../../api'

const STATUS_TAG = {
  new:          { label: 'New Enquiry',      color: '#b0a0ff', bg: 'rgba(176,160,255,0.12)' },
  trial_booked: { label: 'Trial Booked',     color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  follow_up:    { label: 'Follow-up',        color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  cold:         { label: 'Cold',             color: '#555',    bg: 'rgba(255,255,255,0.06)' },
  enrolled:     { label: 'Enrolled',         color: '#ccff00', bg: 'rgba(204,255,0,0.08)' },
}

const SOURCES = ['instagram', 'google', 'referral', 'website', 'walkin', 'other']

function StatusBadge({ status }) {
  const t = STATUS_TAG[status] ?? STATUS_TAG.new
  return (
    <View style={{ backgroundColor: t.bg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
      <Text style={{ fontSize: 11, fontWeight: '700', color: t.color }}>{t.label}</Text>
    </View>
  )
}

function LeadDetailSheet({ lead: l, onClose, onUpdated }) {
  const [status, setStatus] = useState(l.status)
  const [notes, setNotes] = useState(l.notes || '')
  const [saving, setSaving] = useState(false)
  const [logging, setLogging] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      const res = await leadsApi.update(l.id, { status, notes })
      onUpdated(res.data)
      onClose()
    } catch {
      Alert.alert('Error', 'Could not save changes.')
    } finally { setSaving(false) }
  }

  async function handleLogContact() {
    setLogging(true)
    try {
      const res = await leadsApi.logContact(l.id)
      onUpdated(res.data)
      Alert.alert('Logged', 'Contact logged successfully.')
    } catch {}
    finally { setLogging(false) }
  }

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={sh.overlay}>
        <View style={sh.sheet}>
          <View style={sh.header}>
            <View style={{ flex: 1 }}>
              <Text style={sh.name}>{l.name}</Text>
              {l.email ? <Text style={sh.meta}>{l.email}</Text> : null}
              {l.phone ? <Text style={sh.meta}>{l.phone}</Text> : null}
              <Text style={sh.source}>via {l.source}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={sh.closeBtn}>
              <Text style={sh.closeBtnText}>CLOSE</Text>
            </TouchableOpacity>
          </View>

          {/* Status picker */}
          <Text style={sh.sectionLabel}>STATUS</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            {Object.entries(STATUS_TAG).map(([k, v]) => (
              <TouchableOpacity
                key={k}
                style={[sh.statusChip, status === k && { backgroundColor: v.bg, borderColor: v.color }]}
                onPress={() => setStatus(k)}
              >
                <Text style={[sh.statusChipText, status === k && { color: v.color }]}>{v.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Notes */}
          <Text style={sh.sectionLabel}>NOTES</Text>
          <TextInput
            style={sh.notesInput}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            placeholder="Add notes…"
            placeholderTextColor="#555"
            selectionColor="#ccff00"
          />

          {l.last_contact_at && (
            <Text style={sh.lastContact}>
              Last contact: {new Date(l.last_contact_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
            </Text>
          )}

          <TouchableOpacity style={sh.logBtn} onPress={handleLogContact} disabled={logging}>
            {logging ? <ActivityIndicator color="#fff" size="small" /> : <Text style={sh.logBtnText}>📞 Log contact now</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={[sh.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color="#000" size="small" /> : <Text style={sh.saveBtnText}>Save changes</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const sh = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.75)' },
  sheet: { backgroundColor: '#111', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 44 },
  header: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20 },
  name: { fontSize: 18, fontWeight: '800', color: '#fff', marginBottom: 4 },
  meta: { fontSize: 13, color: '#888', marginBottom: 2 },
  source: { fontSize: 12, color: '#555', marginTop: 2, textTransform: 'capitalize' },
  closeBtn: { paddingLeft: 12 },
  closeBtnText: { color: '#555', fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  sectionLabel: { fontSize: 11, fontWeight: '800', color: '#555', letterSpacing: 0.8, marginBottom: 8 },
  statusChip: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#333', marginRight: 8, backgroundColor: '#1a1a1a' },
  statusChipText: { fontSize: 13, fontWeight: '700', color: '#555' },
  notesInput: { backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#333', borderRadius: 10, color: '#fff', fontSize: 14, padding: 12, minHeight: 90, marginBottom: 12 },
  lastContact: { fontSize: 12, color: '#555', marginBottom: 12 },
  logBtn: { borderWidth: 1, borderColor: '#333', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginBottom: 10 },
  logBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  saveBtn: { backgroundColor: '#ccff00', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  saveBtnText: { color: '#000', fontWeight: '800', fontSize: 14 },
})

function LeadRow({ lead, onPress }) {
  const t = STATUS_TAG[lead.status] ?? STATUS_TAG.new
  return (
    <TouchableOpacity style={s.row} onPress={onPress} activeOpacity={0.75}>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Text style={s.name}>{lead.name}</Text>
          <StatusBadge status={lead.status} />
        </View>
        <Text style={s.sub}>
          {[lead.email, lead.phone].filter(Boolean).join('  ·  ') || 'No contact info'}
        </Text>
        <Text style={s.sub2}>
          {lead.source}
          {lead.last_contact_at ? `  ·  Last contact: ${new Date(lead.last_contact_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}` : ''}
        </Text>
      </View>
    </TouchableOpacity>
  )
}

export default function LeadsScreen() {
  const { data, loading, refetch } = useApi(() => leadsApi.list())
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [selected, setSelected] = useState(null)
  const [leadList, setLeadList] = useState(null)

  const allLeads = leadList ?? (data?.results || data || [])

  const shown = allLeads.filter(l => {
    const matchFilter = filter === 'all' || l.status === filter
    const matchSearch = !search || l.name.toLowerCase().includes(search.toLowerCase()) || l.email?.toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  function handleUpdated(updated) {
    setLeadList(prev => (prev ?? allLeads).map(l => l.id === updated.id ? updated : l))
    setSelected(updated)
  }

  return (
    <View style={s.root}>
      {/* Search */}
      <View style={s.searchRow}>
        <TextInput
          style={s.search}
          placeholder="Search name or email…"
          placeholderTextColor="#555"
          value={search}
          onChangeText={setSearch}
          selectionColor="#ccff00"
        />
      </View>

      {/* Filter tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterRow} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
        {[['all', 'All'], ['new', 'New'], ['trial_booked', 'Trial'], ['follow_up', 'Follow-up'], ['cold', 'Cold'], ['enrolled', 'Enrolled']].map(([key, label]) => (
          <TouchableOpacity
            key={key}
            style={[s.chip, filter === key && s.chipActive]}
            onPress={() => setFilter(key)}
          >
            <Text style={[s.chipText, filter === key && s.chipTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={shown}
        keyExtractor={l => String(l.id)}
        renderItem={({ item }) => <LeadRow lead={item} onPress={() => setSelected(item)} />}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => { setLeadList(null); refetch() }} />}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: '#1a1a1a' }} />}
        ListEmptyComponent={
          !loading && (
            <View style={s.empty}>
              <Text style={s.emptyText}>{allLeads.length === 0 ? 'No leads yet.' : 'No leads match your search.'}</Text>
            </View>
          )
        }
      />

      {selected && (
        <LeadDetailSheet
          lead={selected}
          onClose={() => setSelected(null)}
          onUpdated={handleUpdated}
        />
      )}
    </View>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  searchRow: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  search: { backgroundColor: '#111', borderWidth: 1, borderColor: '#222', borderRadius: 10, color: '#fff', fontSize: 15, paddingHorizontal: 14, paddingVertical: 10 },
  filterRow: { marginBottom: 4 },
  chip: { backgroundColor: '#1a1a1a', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: '#333' },
  chipActive: { backgroundColor: 'rgba(204,255,0,0.1)', borderColor: '#ccff00' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#555' },
  chipTextActive: { color: '#ccff00' },
  row: { paddingVertical: 14, paddingHorizontal: 4 },
  name: { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 3 },
  sub: { fontSize: 13, color: '#666', marginBottom: 2 },
  sub2: { fontSize: 12, color: '#444', textTransform: 'capitalize' },
  empty: { paddingTop: 60, alignItems: 'center' },
  emptyText: { fontSize: 14, color: '#555' },
})
