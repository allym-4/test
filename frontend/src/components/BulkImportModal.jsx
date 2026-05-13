import { useState, useRef } from 'react'
import { users } from '../api'

const TEMPLATE_HEADERS = 'first_name,last_name,email,phone,pronouns,date_of_birth,emergency_contact_name,emergency_contact_phone,notes'
const TEMPLATE_EXAMPLE = 'Jane,Smith,jane.smith@email.com,0412345678,she/her,15/06/1992,John Smith,0498765432,Shoulder injury - right side'

export default function BulkImportModal({ onClose, onImported }) {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef()

  function handleFile(f) {
    if (!f || !f.name.endsWith('.csv')) {
      setError('Please upload a .csv file')
      return
    }
    setFile(f)
    setError(null)
    const reader = new FileReader()
    reader.onload = e => {
      const lines = e.target.result.split('\n').filter(Boolean)
      setPreview({ headers: lines[0], rows: lines.slice(1, 4), total: lines.length - 1 })
    }
    reader.readAsText(f)
  }

  async function handleImport() {
    if (!file) return
    setLoading(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const { data } = await users.bulkImport(formData)
      setResult(data)
      if (data.created > 0) onImported()
    } catch (err) {
      setError(err.response?.data?.error || 'Import failed')
    } finally {
      setLoading(false)
    }
  }

  function downloadTemplate() {
    const csv = TEMPLATE_HEADERS + '\n' + TEMPLATE_EXAMPLE
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'duality-student-import-template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="sd-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sd-modal" style={{ maxWidth: 580 }}>
        <div className="sd-header">
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 18 }}>Bulk Import Students</div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="sd-body">

          {!result ? (
            <>
              <div style={{ background: 'rgba(176,160,255,0.06)', border: '1px solid rgba(176,160,255,0.2)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 13 }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>CSV Format</div>
                <div style={{ color: 'var(--grey)', marginBottom: 10, lineHeight: 1.6 }}>
                  Your CSV must have a header row. Required columns: <b style={{ color: 'var(--white)' }}>first_name</b>, <b style={{ color: 'var(--white)' }}>last_name</b>, <b style={{ color: 'var(--white)' }}>email</b>.<br />
                  Optional: phone, pronouns, date_of_birth (DD/MM/YYYY), emergency_contact_name, emergency_contact_phone, notes.<br />
                  Students with existing emails will be skipped. Default password: <b style={{ color: 'var(--lime)' }}>Welcome1!</b>
                </div>
                <button className="btn btn-ghost btn-xs" onClick={downloadTemplate}>↓ Download Template</button>
              </div>

              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]) }}
                onClick={() => fileRef.current.click()}
                style={{
                  border: `2px dashed ${dragOver ? 'var(--lime)' : file ? 'rgba(204,255,0,0.4)' : 'var(--border)'}`,
                  borderRadius: 12,
                  padding: '32px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: dragOver ? 'rgba(204,255,0,0.04)' : 'transparent',
                  transition: 'all 0.15s',
                  marginBottom: 16,
                }}
              >
                <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
                {file ? (
                  <>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>📄</div>
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{file.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--grey)' }}>{preview?.total} student{preview?.total !== 1 ? 's' : ''} detected · Click to change</div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>📁</div>
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Drop your CSV here</div>
                    <div style={{ fontSize: 12, color: 'var(--grey)' }}>or click to browse</div>
                  </>
                )}
              </div>

              {preview && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--grey)', marginBottom: 8, fontWeight: 600 }}>Preview (first 3 rows)</div>
                  <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid var(--border)' }}>
                    <table style={{ fontSize: 11, width: '100%' }}>
                      <thead>
                        <tr>{preview.headers.split(',').map(h => <th key={h} style={{ padding: '6px 10px', color: 'var(--grey)', textAlign: 'left', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h.trim()}</th>)}</tr>
                      </thead>
                      <tbody>
                        {preview.rows.map((row, i) => (
                          <tr key={i}>{row.split(',').map((cell, j) => <td key={j} style={{ padding: '6px 10px', borderBottom: '1px solid #111', whiteSpace: 'nowrap' }}>{cell.trim()}</td>)}</tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {error && <div style={{ background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--red)', marginBottom: 14 }}>{error}</div>}

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
                <button className="btn btn-lime btn-sm" onClick={handleImport} disabled={!file || loading}>
                  {loading ? 'Importing…' : `Import ${preview?.total || ''} Students`}
                </button>
              </div>
            </>
          ) : (
            <div>
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>
                  {result.errors === 0 ? '✓' : '⚠'}
                </div>
                <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 20, marginBottom: 6 }}>Import Complete</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
                {[
                  ['Created', result.created, 'var(--lime)'],
                  ['Skipped', result.skipped, 'var(--amber)'],
                  ['Errors', result.errors, result.errors > 0 ? 'var(--red)' : 'var(--grey)'],
                ].map(([label, val, color]) => (
                  <div key={label} style={{ background: '#111', borderRadius: 10, padding: '14px', textAlign: 'center' }}>
                    <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 24, color }}>{val}</div>
                    <div style={{ fontSize: 11, color: 'var(--grey)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 4 }}>{label}</div>
                  </div>
                ))}
              </div>

              {result.students.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--grey)', marginBottom: 8, fontWeight: 600 }}>Created Students</div>
                  <div style={{ maxHeight: 200, overflowY: 'auto', borderRadius: 8, border: '1px solid var(--border)' }}>
                    <table style={{ fontSize: 12, width: '100%' }}>
                      <thead><tr>
                        <th style={{ padding: '6px 12px', color: 'var(--grey)', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>Name</th>
                        <th style={{ padding: '6px 12px', color: 'var(--grey)', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>Username</th>
                        <th style={{ padding: '6px 12px', color: 'var(--grey)', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>Temp Password</th>
                      </tr></thead>
                      <tbody>
                        {result.students.map((s, i) => (
                          <tr key={i}>
                            <td style={{ padding: '6px 12px', borderBottom: '1px solid #111' }}><b>{s.name}</b></td>
                            <td style={{ padding: '6px 12px', borderBottom: '1px solid #111', fontFamily: 'monospace', color: 'var(--grey)' }}>{s.username}</td>
                            <td style={{ padding: '6px 12px', borderBottom: '1px solid #111', fontFamily: 'monospace', color: 'var(--lime)' }}>{s.password}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {result.skipped_detail.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--amber)', marginBottom: 6, fontWeight: 600 }}>Skipped</div>
                  {result.skipped_detail.map((s, i) => (
                    <div key={i} style={{ fontSize: 12, color: 'var(--grey)', padding: '3px 0' }}>{s.name} — {s.reason}</div>
                  ))}
                </div>
              )}

              {result.error_detail.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--red)', marginBottom: 6, fontWeight: 600 }}>Errors</div>
                  {result.error_detail.map((e, i) => (
                    <div key={i} style={{ fontSize: 12, color: 'var(--grey)', padding: '3px 0' }}>Row {e.row}: {e.reason}</div>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                <button className="btn btn-lime btn-sm" onClick={onClose}>Done</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
