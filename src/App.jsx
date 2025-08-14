import React, { useEffect, useMemo, useRef, useState } from 'react'

const STORAGE_KEY = 'frh-entries-v1'

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36)
const isValidDateStr = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(new Date(s).valueOf())

function startOfWeek(d) {
  const date = new Date(d)
  const day = date.getDay()   // 0 Sun..6 Sat
  const diff = (day + 6) % 7  // Monday as start
  date.setDate(date.getDate() - diff)
  date.setHours(0,0,0,0)
  return date
}

function toCSV(rows) {
  const header = ['RO','Date','Description','Hours Flagged']
  const esc = (v) => '"' + String(v ?? '').replaceAll('"','""') + '"'
  const lines = [header.join(',')].concat(rows.map(r => [r.ro, r.date, r.description, r.hours].map(esc).join(',')))
  return lines.join('\n')
}

function download(filename, content, mime) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export default function App() {
  const [entries, setEntries] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [] } catch { return [] }
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  }, [entries])

  // form state
  const [ro, setRo] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0,10))
  const [description, setDescription] = useState('')
  const [hours, setHours] = useState('')
  const hoursRef = useRef(null)

  // filters
  const [q, setQ] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  // editing modal
  const [editing, setEditing] = useState(null)

  const addEntry = () => {
    const cleanRo = ro.trim()
    if (!cleanRo) return alert('RO is required')
    if (!isValidDateStr(date)) return alert('Date is required (YYYY-MM-DD)')
    const h = parseFloat(String(hours).trim())
    if (Number.isNaN(h) || h < 0) return alert('Hours must be a number ≥ 0')
    const row = { id: uid(), ro: cleanRo, date, description: description.trim(), hours: h }
    setEntries(prev => [row, ...prev].sort((a,b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)))
    setRo(''); setDescription(''); setHours(''); hoursRef.current?.focus()
  }

  const saveEdit = (patch) => {
    setEntries(prev => prev.map(e => e.id === editing.id ? { ...e, ...patch, hours: parseFloat(patch.hours) } : e))
    setEditing(null)
  }
  const deleteEntry = id => setEntries(prev => prev.filter(e => e.id !== id))

  const filtered = useMemo(() => {
    return entries.filter(e => {
      const t = (e.ro + ' ' + e.description).toLowerCase()
      const okText = q.trim() ? t.includes(q.trim().toLowerCase()) : true
      const okFrom = from && isValidDateStr(from) ? e.date >= from : true
      const okTo   = to && isValidDateStr(to) ? e.date <= to   : true
      return okText && okFrom && okTo
    })
  }, [entries, q, from, to])

  const totalAll = useMemo(() => entries.reduce((s,e)=>s+(+e.hours||0), 0), [entries])
  const totalFiltered = useMemo(() => filtered.reduce((s,e)=>s+(+e.hours||0), 0), [filtered])

  const setQuickRange = (k) => {
    const today = new Date(); today.setHours(0,0,0,0)
    const t = today.toISOString().slice(0,10)
    if (k==='today') { setFrom(t); setTo(t); return }
    if (k==='week')  { const sow = startOfWeek(today).toISOString().slice(0,10); setFrom(sow); setTo(t); return }
    if (k==='month') { const first = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0,10); setFrom(first); setTo(t); return }
    setFrom(''); setTo('')
  }

  const exportCSV = () => download(`flat_rate_hours_${Date.now()}.csv`, toCSV(filtered), 'text/csv;charset=utf-8')
  const exportJSON = () => download(`flat_rate_hours_${Date.now()}.json`, JSON.stringify(entries,null,2), 'application/json')

  const importJSON = (file) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result))
        if (!Array.isArray(data)) throw new Error('Invalid')
        const normalize = (d) => ({
          id: d.id || uid(),
          ro: String(d.ro ?? '').trim(),
          date: isValidDateStr(d.date) ? d.date : new Date().toISOString().slice(0,10),
          description: String(d.description ?? ''),
          hours: Number(d.hours) || 0
        })
        const merged = [...data.map(normalize), ...entries]
        merged.sort((a,b)=>(a.date<b.date?1:a.date>b.date?-1:0))
        setEntries(merged)
      } catch (e) { alert('Import failed. Provide a JSON export from this app.') }
    }
    reader.readAsText(file)
  }

  return (
    <div className="container">
      <h1>Flat Rate Hour Tracker</h1>
      <div className="sub">Fast, clean, local-only data.</div>

      {/* Totals */}
      <div className="card">
        <div className="card-header">Total Hours Turned</div>
        <div className="card-body grid cols-12">
          <div className="tile">
            <div className="muted">All Time</div>
            <div className="big">{totalAll.toFixed(2)}</div>
          </div>
          <div className="tile">
            <div className="muted">Filtered</div>
            <div className="big">{totalFiltered.toFixed(2)}</div>
          </div>
          <div className="tile">
            <div className="muted">Entries</div>
            <div className="big">{filtered.length}</div>
          </div>
        </div>
      </div>

      {/* Add Entry */}
      <div className="card">
        <div className="card-header">Add Job</div>
        <div className="card-body grid cols-12">
          <div>
            <label htmlFor="ro">RO</label>
            <input id="ro" value={ro} onChange={e=>setRo(e.target.value)} placeholder="RO #" />
          </div>
          <div>
            <label htmlFor="date">Date</label>
            <input id="date" type="date" value={date} onChange={e=>setDate(e.target.value)} />
          </div>
          <div>
            <label htmlFor="desc">Description</label>
            <input id="desc" value={description} onChange={e=>setDescription(e.target.value)} placeholder="Job description" />
          </div>
          <div>
            <label htmlFor="hours">Hours Flagged</label>
            <input id="hours" ref={hoursRef} inputMode="decimal" value={hours} onChange={e=>setHours(e.target.value)} placeholder="e.g. 2.5" />
          </div>
          <div className="row">
            <button className="primary" onClick={addEntry}>Add Entry</button>
            <button className="secondary" onClick={()=>{ setRo(''); setDate(new Date().toISOString().slice(0,10)); setDescription(''); setHours(''); }}>Reset Form</button>
          </div>
        </div>
      </div>

      {/* Filters & Export */}
      <div className="card">
  <div className="card-header">Filter & Export</div>
  <div className="card-body">
    <div className="filters">
      <div className="field">
        <label htmlFor="q">Search</label>
        <input id="q" value={q} onChange={e=>setQ(e.target.value)} placeholder="Search RO or description" />
      </div>

      <div className="field">
        <label htmlFor="from">From</label>
        <input id="from" type="date" value={from} onChange={e=>setFrom(e.target.value)} />
      </div>

      <div className="field">
        <label htmlFor="to">To</label>
        <input id="to" type="date" value={to} onChange={e=>setTo(e.target.value)} />
      </div>

      <div className="buttons">
        <button className="secondary" onClick={()=>setQuickRange('today')}>Today</button>
        <button className="secondary" onClick={()=>setQuickRange('week')}>This Week</button>
        <button className="secondary" onClick={()=>setQuickRange('month')}>This Month</button>
        <button className="ghost" onClick={()=>setQuickRange('clear')}>Clear</button>
        <button onClick={exportCSV}>Export CSV</button>
        <button onClick={exportJSON}>Export JSON</button>
        <label className="pill" htmlFor="import">Import JSON</label>
        <input id="import" className="hidden" type="file" accept="application/json,.json"
               onChange={(e)=>{ const f=e.target.files?.[0]; if (f) importJSON(f); e.currentTarget.value=''; }} />
      </div>
    </div>
  </div>
</div>


      {/* Table */}
      <div className="card">
        <div className="card-header">Entries</div>
        <div className="card-body">
          <div style={{overflowX: 'auto'}}>
            <table>
              <thead>
                <tr>
                  <th>RO</th>
                  <th>Date</th>
                  <th>Description</th>
                  <th className="right">Hours</th>
                  <th className="right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan="5" style={{textAlign:'center', padding:'18px 0', color:'#94a3b8'}}>No entries yet. Add your first job above.</td></tr>
                )}
                {filtered.map(r => (
                  <tr key={r.id}>
                    <td style={{fontWeight:600}}>{r.ro}</td>
                    <td>{r.date}</td>
                    <td>{r.description}</td>
                    <td className="right">{Number(r.hours).toFixed(2)}</td>
                    <td className="right">
                      <button onClick={()=>setEditing(r)}>Edit</button>{' '}
                      <button className="danger" onClick={()=>deleteEntry(r.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="footer">
            <div>Filtered Total: <strong>{totalFiltered.toFixed(2)}</strong> hrs</div>
            <button className="danger" onClick={()=>{ if (confirm('Delete all entries?')) setEntries([]) }}>Clear All</button>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editing && (
        <EditModal
          entry={editing}
          onClose={()=>setEditing(null)}
          onSave={saveEdit}
        />
      )}
    </div>
  )
}

function EditModal({ entry, onClose, onSave }) {
  const [ro, setRo] = useState(entry.ro)
  const [date, setDate] = useState(entry.date)
  const [description, setDescription] = useState(entry.description)
  const [hours, setHours] = useState(String(entry.hours))

  const submit = () => {
    if (!ro.trim()) return alert('RO is required')
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return alert('Valid date required')
    const h = parseFloat(hours)
    if (Number.isNaN(h) || h<0) return alert('Hours must be a number ≥ 0')
    onSave({ ro: ro.trim(), date, description: description.trim(), hours: h })
  }

  return (
    <div style={overlayStyle}>
      <div style={modalStyle} className="card">
        <div className="card-header">Edit Entry</div>
        <div className="card-body grid cols-12">
          <div>
            <label>RO</label>
            <input value={ro} onChange={e=>setRo(e.target.value)} />
          </div>
          <div>
            <label>Date</label>
            <input type="date" value={date} onChange={e=>setDate(e.target.value)} />
          </div>
          <div>
            <label>Description</label>
            <input value={description} onChange={e=>setDescription(e.target.value)} />
          </div>
          <div>
            <label>Hours Flagged</label>
            <input inputMode="decimal" value={hours} onChange={e=>setHours(e.target.value)} />
          </div>
          <div className="row">
            <button onClick={submit} className="primary">Save</button>
            <button onClick={onClose}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  )
}

const overlayStyle = {
  position:'fixed', inset:0, background:'rgba(0,0,0,.5)', display:'flex', alignItems:'center', justifyContent:'center', padding:16, zIndex:50
}
const modalStyle = { width:'min(680px, 100%)' }
