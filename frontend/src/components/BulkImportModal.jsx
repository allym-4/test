import { useState, useRef } from 'react'
import { users } from '../api'

const TEMPLATE_HEADERS = [
  'first_name', 'last_name', 'email', 'phone', 'level', 'date_of_birth',
  'pronouns', 'address', 'suburb', 'state', 'postcode',
  'emergency_contact_name', 'emergency_contact_phone', 'classes_attended',
]

function downloadTemplate() {
  const csv = TEMPLATE_HEADERS.join(',') + '\n'
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'duality-student-import-template.csv'
  a.click()
  URL.revokeObjectURL(url)
}

// step: 'upload' | 'preview' | 'importing' | 'done'
export default function BulkImportModal({ onClose, onImported }) {
  const [step, setStep] = useState('upload')
  const [file, setFile] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [previewRows, setPreviewRows] = useState([])
  const [previewSummary, setPreviewSummary] = useState(null)
  const [previewError, setPreviewError] = useState(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [doneCount, setDoneCount] = useState(0)
  const [importError, setImportError] = useState(null)
  const fileRef = useRef()

  async function handleFile(f) {
    if (!f || !f.name.endsWith('.csv')) {
      setPreviewError('Please upload a .csv file')
      return
    }
    setFile(f)
    setPreviewError(null)
    setLoadingPreview(true)

    try {
      const fd = new FormData()
      fd.append('file', f)
      const { data } = await users.import_students_preview(fd)
      setPreviewRows(data.rows || [])
      setPreviewSummary(data.summary || {})
      setStep('preview')
    } catch (err) {
      setPreviewError(err.response?.data?.error || 'Failed to parse CSV')
    } finally {
      setLoadingPreview(false)
    }
  }

  async function handleImport() {
    if (!file) return
    setStep('importing')
    setImportError(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const { data } = await users.import_students(fd)
      setDoneCount(data.summary?.create || 0)
      if ((data.summary?.create || 0) > 0) onImported()
      setStep('done')
    } catch (err) {
      setImportError(err.response?.data?.error || 'Import failed')
      setStep('preview')
    }
  }

  function reset() {
    setFile(null)
    setPreviewRows([])
    setPreviewSummary(null)
    setPreviewError(null)
    setImportError(null)
    setStep('upload')
  }

  const createCount = previewSummary?.create || 0
  const skipCount = previewSummary?.skip || 0
  const errorCount = previewSummary?.error || 0

  return (
    <div className="sd-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sd-modal" style={{ maxWidth: 680 }}>
        <div className="sd-header">
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 18 }}>Import Students via CSV</div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="sd-body">

          {/* ── UPLOAD STEP ── */}
          {step === 'upload' && (
            <>
              <div style={{ background: 'rgba(204,255,0,0.04)', border: '1px solid rgba(204,255,0,0.15)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 13 }}>
                <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--white)' }}>CSV Format</div>
                <div style={{ color: 'var(--grey)', lineHeight: 1.6, marginBottom: 10 }}>
                  Required columns: <b style={{ color: 'var(--white)' }}>first_name</b>, <b style={{ color: 'var(--white)' }}>last_name</b>, <b style={{ color: 'var(--white)' }}>email</b>.<br />
                  Optional: phone, level (1–6), date_of_birth (YYYY-MM-DD or DD/MM/YYYY), pronouns, address, suburb, state, postcode, emergency_contact_name, emergency_contact_phone, classes_attended.<br />
                  Existing emails are skipped automatically. A preview is shown before any data is written.
                </div>
                <button className="btn btn-ghost btn-xs" onClick={downloadTemplate}>↓ Download template</button>
              </div>

              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]) }}
                onClick={() => !loadingPreview && fileRef.current.click()}
                style={{
                  border: `2px dashed ${dragOver ? 'var(--lime)' : 'var(--border)'}`,
                  borderRadius: 12,
                  padding: '40px 32px',
                  textAlign: 'center',
                  cursor: loadingPreview ? 'wait' : 'pointer',
                  background: dragOver ? 'rgba(204,255,0,0.04)' : 'transparent',
                  transition: 'all 0.15s',
                  marginBottom: 16,
                }}
              >
                <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
                <div style={{ fontSize: 36, marginBottom: 10 }}>📁</div>
                {loadingPreview ? (
                  <div style={{ fontSize: 14, color: 'var(--grey)' }}>Parsing CSV…</div>
                ) : (
                  <>
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Drop your CSV here</div>
                    <div style={{ fontSize: 12, color: 'var(--grey)' }}>or click to browse</div>
                  </>
                )}
              </div>

              {previewError && (
                <div style={{ background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--red)', marginBottom: 12 }}>
                  {previewError}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
              </div>
            </>
          )}

          {/* ── PREVIEW STEP ── */}
          {step === 'preview' && (
            <>
              {/* Summary bar */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
                {[
                  ['Will create', createCount, '#ccff00'],
                  ['Skipped', skipCount, '#888'],
                  ['Errors', errorCount, errorCount > 0 ? 'var(--red)' : '#444'],
                ].map(([label, val, color]) => (
                  <div key={label} style={{ background: '#111', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 16px', textAlign: 'center', minWidth: 100, flex: 1 }}>
                    <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 22, color }}>{val}</div>
                    <div style={{ fontSize: 11, color: 'var(--grey)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 3 }}>{label}</div>
                  </div>
                ))}
              </div>

              {importError && (
                <div style={{ background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--red)', marginBottom: 14 }}>
                  {importError}
                </div>
              )}

              {/* Row table */}
              <div style={{ maxHeight: 340, overflowY: 'auto', borderRadius: 8, border: '1px solid var(--border)', marginBottom: 18 }}>
                <table style={{ fontSize: 12, width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ position: 'sticky', top: 0, background: '#111' }}>
                      <th style={{ padding: '8px 12px', color: 'var(--grey)', textAlign: 'left', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>Row</th>
                      <th style={{ padding: '8px 12px', color: 'var(--grey)', textAlign: 'left', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>Name</th>
                      <th style={{ padding: '8px 12px', color: 'var(--grey)', textAlign: 'left', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>Email</th>
                      <th style={{ padding: '8px 12px', color: 'var(--grey)', textAlign: 'left', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((r, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #1a1a1a' }}>
                        <td style={{ padding: '7px 12px', color: 'var(--grey)', fontFamily: 'monospace' }}>{r.row}</td>
                        <td style={{ padding: '7px 12px', fontWeight: 500 }}>{r.name || '—'}</td>
                        <td style={{ padding: '7px 12px', color: 'var(--grey)', fontFamily: 'monospace', fontSize: 11 }}>{r.email || '—'}</td>
                        <td style={{ padding: '7px 12px' }}>
                          {r.status === 'create' && (
                            <span style={{ background: 'rgba(204,255,0,0.12)', color: '#ccff00', border: '1px solid rgba(204,255,0,0.25)', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>Create</span>
                          )}
                          {r.status === 'skip' && (
                            <span style={{ background: 'rgba(140,140,140,0.12)', color: '#aaa', border: '1px solid rgba(140,140,140,0.25)', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600 }} title={r.reason}>Skip — {r.reason}</span>
                          )}
                          {r.status === 'error' && (
                            <span style={{ background: 'rgba(255,68,68,0.1)', color: 'var(--red)', border: '1px solid rgba(255,68,68,0.25)', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600 }} title={r.reason}>Error — {r.reason}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn btn-ghost btn-sm" onClick={reset}>Back</button>
                <button
                  className="btn btn-lime btn-sm"
                  onClick={handleImport}
                  disabled={createCount === 0}
                >
                  Import {createCount} student{createCount !== 1 ? 's' : ''}
                </button>
              </div>
            </>
          )}

          {/* ── IMPORTING STEP ── */}
          {step === 'importing' && (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{ fontSize: 36, marginBottom: 16 }}>⏳</div>
              <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 18, marginBottom: 8 }}>Importing…</div>
              <div style={{ color: 'var(--grey)', fontSize: 13 }}>Creating student accounts, please wait.</div>
            </div>
          )}

          {/* ── DONE STEP ── */}
          {step === 'done' && (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>✓</div>
              <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 22, marginBottom: 8 }}>Import Complete</div>
              <div style={{ color: 'var(--grey)', fontSize: 14, marginBottom: 28 }}>
                {doneCount} student{doneCount !== 1 ? 's' : ''} imported successfully.
              </div>
              <button className="btn btn-lime btn-sm" onClick={onClose}>Close</button>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
