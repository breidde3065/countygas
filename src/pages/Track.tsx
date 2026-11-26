import { useCallback, useEffect, useState, useRef } from 'react';
import type { FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { kes, usePageTitle } from '../lib';
import { itemText, statusLabel, when } from '../orders';
import type { Status, TrackedOrder } from '../orders';
import { useSettings } from '../settings';
import { Field, PageHead } from '../ui';

const FLOW: Status[] = ['new', 'confirmed', 'dispatched', 'completed'];
const FLOW_LABEL: Record<Status, string> = { new: 'Order received', confirmed: 'Confirmed by the branch', dispatched: '', completed: 'Completed', cancelled: '' };

export default function Track() {
  usePageTitle('Track your order');
  const { branches } = useSettings();
  const [params] = useSearchParams();
  const [ref, setRef] = useState((params.get('ref') ?? '').toUpperCase());
  const [phone, setPhone] = useState(
    () => window.sessionStorage.getItem('county-gas-track-phone') ?? ''
  );
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const lookup = useCallback(async (quiet = false) => {
    if (!quiet) { setBusy(true); setError(''); }
    try {
      const q = new URLSearchParams({ ref: ref.trim(), phone: phone.trim() });
      setOrder(await api<TrackedOrder>(`/api/orders/track?${q}`));
    } catch (e) {
      if (!quiet) { setOrder(null); setError((e as Error).message); }
    } finally { if (!quiet) setBusy(false); }
  }, [ref, phone]);
  const autoLookupDone = useRef(false);

  useEffect(() => {
    if (autoLookupDone.current) return;

    const hasOrderRef = params.get('ref')?.trim();
    const hasSavedPhone = phone.trim();

    if (hasOrderRef && hasSavedPhone) {
      autoLookupDone.current = true;
      lookup();
    }
  }, [lookup, params, phone]);
  // keep the status fresh while the page is open
  useEffect(() => {
    if (!order) return;
    const t = window.setInterval(() => lookup(true), 30000);
    return () => window.clearInterval(t);
  }, [order, lookup]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!ref.trim() || !phone.trim()) return setError('Enter your order reference and the phone number you ordered with.');
    lookup();
  };

  const branch = order && branches.find((b) => b.name === order.branchName);
  const reached = (s: Status) => order?.history.find((h) => h.status === s)?.at;
  const idx = order ? FLOW.indexOf(order.status) : -1;

  return (
    <>
      <PageHead eyebrow="TRACK AN ORDER" title={<>WHERE'S MY <em>GAS?</em></>} lead="Enter the reference from your order and the phone number you used." />
      <section className="page-body">
        <div className="two-col">
          <form className="panel" onSubmit={submit} noValidate>
            <h2 className="panel-title">Find your order</h2>
            <Field id="t-ref" label="Order reference" hint="Looks like CG-4F7K2.">
              <input id="t-ref" autoCapitalize="characters" autoComplete="off" value={ref} onChange={(e) => setRef(e.target.value.toUpperCase())} />
            </Field>
            <Field id="t-phone" label="Phone number" error={error}>
              <input id="t-phone" type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} aria-invalid={!!error} aria-describedby="t-phone-note" />
            </Field>
            <button type="submit" className="button button-dark" disabled={busy}>{busy ? 'Looking…' : 'Track order'}</button>
          </form>

          {order && (
            <div className="panel" aria-live="polite">
              <h2 className="panel-title">{order.ref}</h2>
              <span className={`badge s-${order.status}`}>{statusLabel(order.status, order.mode)}</span>

              {order.status === 'cancelled' ? (
                <p className="panel-note">This order was cancelled. If that’s a surprise, please call the branch.</p>
              ) : (
                <ol className="timeline">
                  {FLOW.map((s, i) => {
                    const at = reached(s);
                    return (
                      <li key={s} className={i < idx || order.status === 'completed' ? 'done' : i === idx ? 'current' : ''}>
                        <div><strong>{FLOW_LABEL[s] || statusLabel(s, order.mode)}</strong>{at && <small>{when(at)}</small>}</div>
                      </li>
                    );
                  })}
                </ol>
              )}

              <dl className="kv">
                {order.items.map((it, i) => (<div key={i}><dt>{itemText(it)}</dt><dd>{kes(it.unitPrice * it.qty)}</dd></div>))}
                <div><dt>Branch</dt><dd>{order.branchName}</dd></div>
                <div><dt>{order.mode === 'delivery' ? 'Delivery' : 'Pickup'}</dt><dd>{order.mode === 'delivery' ? kes(order.deliveryFee) : 'From the branch'}</dd></div>
              </dl>
              {branch && <a className="button button-soft panel-action" href={`tel:${branch.phone}`}>Call {branch.name}</a>}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
