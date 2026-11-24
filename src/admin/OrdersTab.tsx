import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import { api } from '../api';
import { kes, waLink } from '../lib';
import { STATUSES, intlPhone, itemText, statusLabel, when } from '../orders';
import type { Order, Status } from '../orders';
import { useSettings } from '../settings';
import { Field } from '../ui';

export function OrdersTab({ onLogout }: { onLogout: () => void }) {
  const { business } = useSettings();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | Status>('all');
  const [q, setQ] = useState('');

  const fail = useCallback((e: Error & { status?: number }) => { if (e.status === 401) onLogout(); else setError(e.message); }, [onLogout]);
  const load = useCallback(() => { api<Order[]>('/api/admin/orders').then((d) => { setOrders(d); setError(''); }).catch(fail); }, [fail]);
  useEffect(() => {
    load();
    const t = window.setInterval(load, 30000); // pick up new orders without a refresh
    return () => window.clearInterval(t);
  }, [load]);

  const setStatus = (ref: string, status: Status) =>
    api<Order>(`/api/admin/orders/${ref}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
      .then((o) => setOrders((all) => all?.map((x) => (x.ref === ref ? o : x)) ?? null))
      .catch(fail);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: orders?.length ?? 0 };
    STATUSES.forEach((s) => { c[s] = orders?.filter((o) => o.status === s).length ?? 0; });
    return c;
  }, [orders]);

  const shown = useMemo(() => {
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    return (orders ?? []).filter((o) => (filter === 'all' || o.status === filter) && terms.every((t) => `${o.ref} ${o.name} ${o.phone} ${o.branchName}`.toLowerCase().includes(t)));
  }, [orders, filter, q]);

  return (
    <>
      <div className="admin-bar">
        <h2 className="panel-title">{counts.new ? `${counts.new} new · ` : ''}{counts.all} order{counts.all === 1 ? '' : 's'}</h2>
        <a className="button button-soft" href="/api/admin/orders.csv" download>Export CSV</a>
      </div>

      <div className="pills" role="group" aria-label="Filter by status">
        <button type="button" className="pill-btn" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>All {counts.all}</button>
        {STATUSES.map((s) => (
          <button key={s} type="button" className="pill-btn" aria-pressed={filter === s} onClick={() => setFilter(s)}>{statusLabel(s, 'delivery').replace('On the way', 'Dispatched')} {counts[s]}</button>
        ))}
      </div>
      <div className="order-filters">
        <form className="search" role="search" onSubmit={(e) => e.preventDefault()}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
          <input type="search" aria-label="Search orders" placeholder="Search by reference, name, phone or branch" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" />
        </form>
      </div>

      {error && <p className="field-error" role="alert">{error}</p>}
      {orders === null && !error && <p className="panel-note">Loading orders…</p>}
      {orders?.length === 0 && <div className="panel"><p className="panel-note">No orders yet. New orders appear here the moment a customer sends one.</p></div>}
      {orders && orders.length > 0 && shown.length === 0 && <div className="panel"><p className="panel-note">No orders match that.</p></div>}

      <div className="admin-orders" style={{ marginTop: 20 }}>
        {shown.map((o) => (
          <details className={`admin-branch order-row${o.status === 'new' ? ' order-new' : ''}`} key={o.ref}>
            <summary>
              <strong>{o.ref}</strong>
              <span>{o.name} · {when(o.createdAt)}</span>
              <span>{kes(o.total)}</span>
              <span className={`badge s-${o.status}`}>{statusLabel(o.status, o.mode)}</span>
            </summary>
            <div className="body">
              <div className="order-detail">
                <dl className="kv">
                  <div><dt>Customer</dt><dd>{o.name}</dd></div>
                  <div><dt>Phone</dt><dd><a className="inline-link" href={`tel:${o.phone}`}>{o.phone}</a></dd></div>
                  <div><dt>Branch</dt><dd>{o.branchName}</dd></div>
                  <div><dt>{o.mode === 'delivery' ? 'Deliver to' : 'Pickup'}</dt><dd>{o.mode === 'delivery' ? o.location : 'From the branch'}</dd></div>
                  <div><dt>Payment</dt><dd>{o.payment}</dd></div>
                  {o.note && <div><dt>Note</dt><dd>{o.note}</dd></div>}
                </dl>
                <dl className="kv">
                  {o.items.map((it, i) => (<div key={i}><dt>{itemText(it)}</dt><dd>{kes(it.unitPrice * it.qty)}</dd></div>))}
                  <div><dt>Cylinders total</dt><dd><strong>{kes(o.total)}</strong></dd></div>
                  {o.mode === 'delivery' && <div><dt>Delivery fee</dt><dd>{kes(o.deliveryFee)}</dd></div>}
                  {o.history.map((h, i) => (<div key={i}><dt>{statusLabel(h.status, o.mode)}</dt><dd>{when(h.at)}</dd></div>))}
                </dl>
              </div>
              <Field id={`st-${o.ref}`} label="Order status">
                <select id={`st-${o.ref}`} value={o.status} onChange={(e: ChangeEvent<HTMLSelectElement>) => setStatus(o.ref, e.target.value as Status)}>
                  {STATUSES.map((s) => (<option key={s} value={s}>{statusLabel(s, o.mode)}</option>))}
                </select>
              </Field>
              <div className="actions">
                <a className="button button-dark" href={`tel:${o.phone}`}>Call customer</a>
                <a className="button button-soft" target="_blank" rel="noopener noreferrer" href={waLink(intlPhone(o.phone), `Hello ${o.name}, this is ${business.name} about your order ${o.ref}.`)}>WhatsApp customer</a>
              </div>
            </div>
          </details>
        ))}
      </div>
    </>
  );
}
