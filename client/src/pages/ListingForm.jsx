import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'

// This page is routed at /listings/new (sell) and /listings/:id (edit),
// and both routes are wrapped in <ProtectedRoute>.

const defaults = { title: '', description: '', price: 0, category: 'other', condition: 'used', status: 'active' }

const CATEGORIES = ['textbooks', 'electronics', 'furniture', 'clothing', 'other']
const CONDITIONS = ['new', 'like-new', 'used', 'worn']
const STATUSES = ['active', 'sold']

const fieldClass = 'mt-1 w-full rounded border border-gray-300 px-3 py-2'

export default function ListingForm() {
  const nav = useNavigate()
  const { id } = useParams()
  const [form, setForm] = useState(defaults)
  const [error, setError] = useState('')

  // Edit mode: when there is an `id`, load the listing and fill the form.
  useEffect(() => {
    if (!id) return
    let cancelled = false
    api
      .get(`/listings/${id}`)
      .then(({ data }) => {
        if (cancelled) return
        // The server may wrap the listing, so unwrap it if needed.
        const l = data.listing ?? data.data ?? data
        setForm({
          title: l.title ?? '',
          description: l.description ?? '',
          price: l.price ?? 0,
          category: l.category ?? 'other',
          condition: l.condition ?? 'used',
          status: l.status ?? 'active',
        })
      })
      .catch((err) => {
        if (!cancelled) setError(messageFrom(err))
      })
    return () => {
      cancelled = true
    }
  }, [id])

  // Update `form` when an input changes (price is stored as a number).
  function onChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: name === 'price' ? (value === '' ? '' : Number(value)) : value,
    }))
  }

  // POST a new listing, or PATCH the existing one when editing,
  // then go back to /listings. Show the server's error message on failure.
  async function onSubmit(e) {
    e.preventDefault()
    setError('')

    // Never send `seller`: the server takes it from the token and rejects it.
    const payload = {
      title: form.title,
      description: form.description,
      price: Number(form.price),
      category: form.category,
      condition: form.condition,
    }

    try {
      if (id) {
        await api.patch(`/listings/${id}`, { ...payload, status: form.status })
      } else {
        await api.post('/listings', payload)
      }
      nav('/listings')
    } catch (err) {
      setError(messageFrom(err))
    }
  }

  return (
    <div className="max-w-lg mx-auto card">
      <h1 className="text-xl font-semibold mb-4">{id ? 'Edit' : 'New'} Listing</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <label className="block text-sm font-medium">
          Title
          <input
            type="text"
            name="title"
            value={form.title}
            onChange={onChange}
            placeholder="Calculus textbook"
            required
            className={fieldClass}
          />
        </label>

        <label className="block text-sm font-medium">
          Price
          <input
            type="number"
            name="price"
            value={form.price}
            onChange={onChange}
            min="0"
            step="any"
            required
            className={fieldClass}
          />
        </label>

        <label className="block text-sm font-medium">
          Category
          <select name="category" value={form.category} onChange={onChange} className={fieldClass}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>

        <label className="block text-sm font-medium">
          Condition
          <select name="condition" value={form.condition} onChange={onChange} className={fieldClass}>
            {CONDITIONS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>

        {id && (
          <label className="block text-sm font-medium">
            Status
            <select name="status" value={form.status} onChange={onChange} className={fieldClass}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
        )}

        <label className="block text-sm font-medium">
          Description (optional)
          <textarea
            name="description"
            value={form.description}
            onChange={onChange}
            rows={4}
            className={fieldClass}
          />
        </label>

        {error && <div className="text-red-600 text-sm">{error}</div>}
        <button className="btn" type="submit">Save</button>
      </form>
    </div>
  )
}

// Prefer the server's message; fall back to something readable.
function messageFrom(err) {
  const data = err?.response?.data
  return data?.message || data?.error || err?.message || 'Something went wrong'
}