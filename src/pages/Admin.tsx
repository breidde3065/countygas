import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { api, categoryLabel } from '../api';
import type { Category, Product } from '../api';
import { kes, usePageTitle } from '../lib';
import { Field, PageHead } from '../ui';
import { BranchesTab, BusinessTab, PricesTab } from '../admin/SettingsTabs';
import {OrdersTab} from '../admin/OrdersTab';


type Draft = { name: string; category: Category; brand: string; size: string; price: string; refillPrice: string; description: string; inStock: boolean };
const blank: Draft = { name: '', category: 'cylinder', brand: '', size: '', price: '', refillPrice: '', description: '', inStock: true };
const toDraft = (p: Product): Draft => ({ name: p.name, category: p.category, brand: p.brand, size: p.size, price: String(p.price), refillPrice: p.refillPrice === null ? '' : String(p.refillPrice), description: p.description, inStock: p.inStock });
const MAX_PHOTOS = 5;

export default function Admin() {
  usePageTitle('Admin');
  const [mode, setMode] = useState<'checking' | 'out' | 'in'>('checking');

  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex';
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);
  useEffect(() => { api('/api/admin/session').then(() => setMode('in')).catch(() => setMode('out')); }, []);

  return (
    <>
      <PageHead eyebrow="ADMIN" title={<>ADMIN <em>DESK.</em></>} lead="Add, edit and remove the products customers see on the site." />
      <section className="page-body">
        {mode === 'checking' && <p className="panel-note">Checking your session…</p>}
        {mode === 'out' && <Login onDone={() => setMode('in')} />}
        {mode === 'in' && <Dashboard onLogout={() => setMode('out')} />}
      </section>
    </>
  );
}

function Login({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
      onDone();
    } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  };
  return (
    <form className="panel done" onSubmit={submit} noValidate>
      <h2 className="panel-title">Sign in</h2>
      <p className="panel-note">Enter the admin password to manage products.</p>
      <Field id="password" label="Password" error={error}>
        <input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={!!error} aria-describedby="password-note" />
      </Field>
      <button type="submit" className="button button-dark" disabled={busy || !password}>{busy ? 'Signing in…' : 'Sign in'}</button>
    </form>
  );
}

function ProductsTab({ onLogout }: { onLogout: () => void }) {
  const [items, setItems] = useState<Product[] | null>(null);
  const [editing, setEditing] = useState<Product | 'new' | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(() => { api<Product[]>('/api/products').then(setItems).catch((e: Error) => setError(e.message)); }, []);
  useEffect(load, [load]);

  const remove = async (id: string) => {
    try { await api(`/api/admin/products/${id}`, { method: 'DELETE' }); setConfirmId(null); load(); }
    catch (e) { const x = e as Error & { status?: number }; if (x.status === 401) onLogout(); else setError(x.message); }
  };

  if (editing) {
    return <ProductForm product={editing === 'new' ? null : editing} onCancel={() => setEditing(null)} onExpired={onLogout} onSaved={() => { setEditing(null); load(); }} />;
  }

  return (
    <>
      <div className="admin-bar">
        <h2 className="panel-title">{items ? `${items.length} product${items.length === 1 ? '' : 's'}` : 'Products'}</h2>
        <div className="actions">
          <button type="button" className="button button-dark" onClick={() => setEditing('new')}>Add product</button>
        </div>
      </div>
      {error && <p className="field-error" role="alert">{error}</p>}
      {items === null && !error && <p className="panel-note">Loading products…</p>}
      {items?.length === 0 && (
        <div className="panel"><p className="panel-note">No products yet. Until you add one, customers see the default price list.</p></div>
      )}
      {!!items?.length && (
        <ul className="admin-list">
          {items.map((p) => (
            <li className="admin-row" key={p.id}>
              <div className="thumb">{p.images[0] ? <img src={p.images[0]} alt="" /> : <span>{p.size ? `${p.size} kg` : 'No photo'}</span>}</div>
              <div className="admin-info">
                <strong>{p.name}</strong>
                <span>{[categoryLabel[p.category], p.brand, p.size && `${p.size} kg`].filter(Boolean).join(' · ')}</span>
                <span>{kes(p.price)}{p.refillPrice !== null && ` · refill ${kes(p.refillPrice)}`}</span>
              </div>
              <span className={`badge${p.inStock ? ' ok' : ''}`}>{p.inStock ? 'In stock' : 'Out of stock'}</span>
              <div className="admin-actions">
                {confirmId === p.id ? (
                  <>
                    <button type="button" className="button button-dark" onClick={() => remove(p.id)}>Confirm delete</button>
                    <button type="button" className="button button-soft" onClick={() => setConfirmId(null)}>Cancel</button>
                  </>
                ) : (
                  <>
                    <button type="button" className="button button-soft" onClick={() => setEditing(p)}>Edit</button>
                    <button type="button" className="linkish" onClick={() => setConfirmId(p.id)}>Delete</button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

type Tab='orders'|'products'|'branches'|'business'|'prices';
const TABS: [Tab, string][] = [['orders', 'Orders'], ['products', 'Products'], ['branches', 'Branches'], ['business', 'Business'], ['prices', 'Prices']];

function Dashboard({ onLogout }: { onLogout: () => void }) {
  const [tab, setTab] = useState<Tab>('products');
  const logout = async () => { await api('/api/admin/logout', { method: 'POST' }).catch(() => {}); onLogout(); };
  return (
    <>
      <div className="admin-tabs">
        <div className="pills" role="group" aria-label="Admin sections">
          {TABS.map(([id, label]) => (
            <button key={id} type="button" className="pill-btn" aria-pressed={tab === id} onClick={() => setTab(id)}>{label}</button>
          ))}
        </div>
        <button type="button" className="linkish" onClick={logout}>Sign out</button>
      </div>
      {tab === 'orders' && <OrdersTab onLogout={onLogout} />}
      {tab === 'products' && <ProductsTab onLogout={onLogout} />}
      {tab === 'branches' && <BranchesTab onLogout={onLogout} />}
      {tab === 'business' && <BusinessTab onLogout={onLogout} />}
      {tab === 'prices' && <PricesTab onLogout={onLogout} />}
    </>
  );
}

function ProductForm({ product, onSaved, onCancel, onExpired }: { product: Product | null; onSaved: () => void; onCancel: () => void; onExpired: () => void }) {
  const [d, setD] = useState<Draft>(product ? toDraft(product) : blank);
  const [kept, setKept] = useState<string[]>(product?.images ?? []);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);

  const set = (k: keyof Draft) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setD({ ...d, [k]: e.target.value });
  const isCylinder = d.category === 'cylinder';

  const pick = (e: ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = '';
    const bad = picked.find((f) => !/^image\/(jpeg|png|webp)$/.test(f.type) || f.size > 5 * 1024 * 1024);
    if (bad) return setError(`${bad.name} must be a JPG, PNG or WebP under 5 MB.`);
    if (kept.length + files.length + picked.length > MAX_PHOTOS) return setError(`A product can have at most ${MAX_PHOTOS} photos.`);
    setError('');
    setFiles([...files, ...picked]);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (d.name.trim().length < 2) return setError('Enter a product name.');
    if (d.price === '' || Number.isNaN(Number(d.price)) || Number(d.price) < 0) return setError('Enter a valid price.');
    const fd = new FormData();
    Object.entries({ ...d, inStock: String(d.inStock) }).forEach(([k, v]) => fd.append(k, v));
    fd.append('keepImages', JSON.stringify(kept.map((u) => u.split('/').pop())));
    files.forEach((f) => fd.append('images', f));
    setSaving(true);
    try {
      await api(product ? `/api/admin/products/${product.id}` : '/api/admin/products', { method: product ? 'PUT' : 'POST', body: fd });
      onSaved();
    } catch (err) {
      const x = err as Error & { status?: number };
      if (x.status === 401) onExpired(); else setError(x.message);
    } finally { setSaving(false); }
  };

  return (
    <form className="panel" onSubmit={submit} noValidate>
      <h2 className="panel-title">{product ? 'Edit product' : 'Add product'}</h2>

      <div className="row2">
        <Field id="p-name" label="Name"><input id="p-name" value={d.name} onChange={set('name')} placeholder="e.g. 13 kg Total cylinder" /></Field>
        <Field id="p-cat" label="Category">
          <select id="p-cat" value={d.category} onChange={set('category')}>
            {(Object.keys(categoryLabel) as Category[]).map((c) => (<option key={c} value={c}>{categoryLabel[c]}</option>))}
          </select>
        </Field>
      </div>
      <div className="row2">
        <Field id="p-brand" label="Brand (optional)"><input id="p-brand" value={d.brand} onChange={set('brand')} /></Field>
        {isCylinder && <Field id="p-size" label="Size in kg" hint="Use 6, 13, 22.5 or 50 so the order form can pre-fill."><input id="p-size" inputMode="decimal" value={d.size} onChange={set('size')} /></Field>}
      </div>
      <div className="row2">
        <Field id="p-price" label={isCylinder ? 'New cylinder price (KES)' : 'Price (KES)'}><input id="p-price" inputMode="numeric" value={d.price} onChange={set('price')} /></Field>
        {isCylinder && <Field id="p-refill" label="Refill price (KES)"><input id="p-refill" inputMode="numeric" value={d.refillPrice} onChange={set('refillPrice')} /></Field>}
      </div>
      <Field id="p-desc" label="Description (optional)"><textarea id="p-desc" value={d.description} onChange={set('description')} maxLength={1000} /></Field>
      <label className="toggle"><input type="checkbox" checked={d.inStock} onChange={(e) => setD({ ...d, inStock: e.target.checked })} />In stock</label>

      <p className="field-label">Photos</p>
      <label className="dropzone">
        <input type="file" className="sr-only" accept="image/jpeg,image/png,image/webp" multiple onChange={pick} />
        <strong>Add photos</strong>
        <span>JPG, PNG or WebP, up to 5 MB each, {MAX_PHOTOS} at most</span>
      </label>
      {(kept.length > 0 || files.length > 0) && (
        <div className="previews">
          {kept.map((u) => (
            <div className="preview" key={u}><img src={u} alt="" /><button type="button" aria-label="Remove photo" onClick={() => setKept(kept.filter((x) => x !== u))}>×</button></div>
          ))}
          {previews.map((u, i) => (
            <div className="preview" key={u}><img src={u} alt="" /><button type="button" aria-label="Remove photo" onClick={() => setFiles(files.filter((_, j) => j !== i))}>×</button></div>
          ))}
        </div>
      )}

      {error && <p className="field-error" role="alert">{error}</p>}
      <div className="actions">
        <button type="submit" className="button button-dark" disabled={saving}>{saving ? 'Saving…' : product ? 'Save changes' : 'Add product'}</button>
        <button type="button" className="button button-soft" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
