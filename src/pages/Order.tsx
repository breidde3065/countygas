import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, useCatalog } from '../api';
import { useSettings } from '../settings';
import { kes, status, useBranch, usePageTitle, waLink } from '../lib';
import { PageHead } from '../ui';

type Kind = 'refill' | 'fresh';
type Line = { id: number; size: string; kind: Kind; qty: number; brand: string };
type Errors = Partial<Record<'name' | 'phone' | 'branch' | 'location', string>>;
type Option = { value: string; title: string; text?: string };

let nextId = 1;
const normalisePhone = (v: string) => v.replace(/[\s-]/g, '');
const validPhone = (v: string) => /^(?:\+?254|0)?[17]\d{8}$/.test(normalisePhone(v));

function Field({ id, label, error, hint, children }: { id: string; label: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children}
      {hint && !error && <p className="field-hint" id={`${id}-note`}>{hint}</p>}
      {error && <p className="field-error" id={`${id}-note`} role="alert">{error}</p>}
    </div>
  );
}

function Choices({ name, label, value, onChange, options, compact }: {
  name: string; label: string; value: string; onChange: (v: string) => void; options: Option[]; compact?: boolean;
}) {
  return (
    <fieldset className="choice-set">
      <legend>{label}</legend>
      <div className={`choices${compact ? ' compact' : ''}`}>
        {options.map((o) => (
          <label key={o.value} className="choice">
            <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} />
            <span className="choice-body"><strong>{o.title}</strong>{o.text && <span>{o.text}</span>}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function Stepper({ id, value, onChange }: { id: string; value: number; onChange: (n: number) => void }) {
  return (
    <div className="stepper">
      <button type="button" aria-label="Decrease quantity" disabled={value <= 1} onClick={() => onChange(value - 1)}>−</button>
      <input id={id} type="number" inputMode="numeric" min={1} max={20} value={value} onChange={(e) => onChange(Number(e.target.value) || 1)} />
      <button type="button" aria-label="Increase quantity" disabled={value >= 20} onClick={() => onChange(value + 1)}>+</button>
    </div>
  );
}

export default function Order() {
  usePageTitle('Order');
  const { branches, brands, sizes } = useSettings();
  const catalog = useCatalog();
  const priceOf = (l: Line) => {
    // a matching admin product wins, then the standard price for that size
    const match = catalog.find((p) => !p.id.startsWith('static') && p.inStock && p.category === 'cylinder' && p.size === l.size && (!l.brand || p.brand === l.brand));
    const base = sizes.find((x) => x.kg === l.size) ?? sizes[0];
    if (match) return l.kind === 'refill' ? (match.refillPrice ?? base.refill) : match.price;
    return l.kind === 'refill' ? base.refill : base.fresh;
  };
  const [params] = useSearchParams();
  const { branch, setBranch } = useBranch();

  const sizeParam = params.get('size');
  const accessory = params.get('accessory');
  const [lines, setLines] = useState<Line[]>([
    {
      id: nextId++,
      size: sizes.some((s) => s.kg === sizeParam) ? (sizeParam as string) : (sizes.find((s) => s.kg === '13') ?? sizes[0]).kg,
      kind: params.get('type') === 'fresh' ? 'fresh' : 'refill',
      qty: 1,
      brand: '',
    },
  ]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [branchId, setBranchId] = useState(branch?.id ?? '');
  const [mode, setMode] = useState('delivery');
  const [location, setLocation] = useState('');
  const [payment, setPayment] = useState('M-Pesa on delivery');
  const [note, setNote] = useState(accessory ? `Also interested in: ${accessory}` : '');
  const [errors, setErrors] = useState<Errors>({});
  const [sentLink, setSentLink] = useState<string | null>(null);
  const [sentRef, setSentRef] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const chosen = branches.find((b) => b.id === branchId);
  const total = lines.reduce((sum, l) => sum + priceOf(l) * l.qty, 0);
  const update = (id: number, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  const clampQty = (n: number) => Math.min(20, Math.max(1, n));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (sending) return;
    const next: Errors = {};
    if (!name.trim()) next.name = 'Enter your name so the rider knows who to ask for.';
    if (!validPhone(phone)) next.phone = 'Enter a Kenyan mobile number, for example 0712 345 678.';
    if (!chosen) next.branch = 'Choose the branch you want to order from.';
    if (mode === 'delivery' && !location.trim()) next.location = 'Add your estate, road and a nearby landmark.';
    setErrors(next);
    const first = Object.keys(next)[0];
    if (first || !chosen) {
      if (first) document.getElementById(first)?.focus();
      return;
    }

    // Open the WhatsApp tab now (browsers only allow it on a tap), then point it at the message once the order is saved.
    const tab = window.open('about:blank', '_blank');
    setSending(true);
    let ref: string | null = null;
    try {
      const saved = await api<{ ref: string }>('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(), phone: normalisePhone(phone), branchId: chosen.id, branchName: chosen.name, mode, location: location.trim(), payment, note: note.trim(),
          deliveryFee: mode === 'delivery' ? chosen.delivery.fee : 0,
          items: lines.map((l) => ({ size: l.size, kind: l.kind, qty: l.qty, brand: l.brand, unitPrice: priceOf(l) })),
        }),
      });
      ref = saved.ref;
    } catch { /* the order still goes out on WhatsApp, just without a tracking reference */ }

    const items = lines.map((l) => `- ${l.qty} x ${l.size} kg ${l.kind === 'refill' ? 'refill' : 'new cylinder'}${l.brand ? ` (${l.brand})` : ''}`);
    const text = [
      'New order from the website',
      ref && `Order ref: ${ref}`,
      `Name: ${name.trim()}`,
      `Phone: ${normalisePhone(phone)}`,
      `Branch: ${chosen.name}`,
      'Items:',
      ...items,
      mode === 'delivery' ? `Delivery to: ${location.trim()}` : 'Pickup from the branch',
      `Payment: ${payment}`,
      `Cylinders total: ${kes(total)}${mode === 'delivery' ? ` (delivery fee ${kes(chosen.delivery.fee)} confirmed by the branch)` : ''}`,
      note.trim() && `Note: ${note.trim()}`,
    ].filter(Boolean).join('\n');

    const link = waLink(chosen.whatsapp, text);
    setBranch(chosen.id);
    setSentRef(ref);
    setSentLink(link);
    setSending(false);
    if (tab) { tab.opener = null; tab.location.href = link; }
  };

  if (sentLink) {
    return (
      <>
        <PageHead eyebrow="ORDER" title={<>ALMOST <em>THERE.</em></>} lead="WhatsApp should have opened with your order filled in. Press send there and the branch will confirm with you." />
        <section className="page-body">
          <div className="panel done">
            <div className="done-mark" aria-hidden="true">✓</div>
            <h2 className="panel-title">Your order is ready to send</h2>
            {sentRef ? (
              <>
                <p className="panel-note">Your order reference</p>
                <div className="ref-box">{sentRef}</div>
                <p className="panel-note">Keep it to track your order. It is only placed once you press send in WhatsApp.</p>
                <div className="actions"><Link className="button button-soft" to={`/track?ref=${sentRef}`}>Track this order</Link></div>
              </>
            ) : (
              <p className="panel-note">We couldn’t save a tracking reference this time, but your order is ready to send. It is only placed once you press send in WhatsApp.</p>
            )}
            <dl className="kv">
              {lines.map((l) => (<div key={l.id}><dt>{l.qty} x {l.size} kg {l.kind === 'refill' ? 'refill' : 'new'}</dt><dd>{kes(priceOf(l) * l.qty)}</dd></div>))}
              <div><dt>Branch</dt><dd>{chosen?.name}</dd></div>
            </dl>
            <div className="actions">
              <a className="button button-dark" href={sentLink} target="_blank" rel="noopener noreferrer">Open WhatsApp again</a>
              <button type="button" className="button button-soft" onClick={() => { setSentLink(null); setSentRef(null); }}>Edit order</button>
            </div>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <PageHead eyebrow="ORDER" title={<>ORDER YOUR <em>GAS.</em></>} lead="Tell us what you need. We send it to your branch on WhatsApp and they confirm price and timing." />

      <section className="page-body">
        <form className="order-grid" onSubmit={submit} noValidate>
          <div>
            <fieldset className="form-block">
              <legend><span className="step-no">1</span>What do you need?</legend>
              {lines.map((l, i) => (
                <div className="line-card" key={l.id}>
                  <div className="line-head">
                    <strong>Item {i + 1}</strong>
                    {lines.length > 1 && <button type="button" className="linkish" onClick={() => setLines((ls) => ls.filter((x) => x.id !== l.id))}>Remove</button>}
                  </div>
                  <Choices compact name={`size-${l.id}`} label="Size" value={l.size} onChange={(v) => update(l.id, { size: v })}
                    options={sizes.map((s) => ({ value: s.kg, title: `${s.kg} kg` }))} />
                  <Choices name={`kind-${l.id}`} label="Type" value={l.kind} onChange={(v) => update(l.id, { kind: v as Kind })}
                    options={[
                      { value: 'refill', title: 'Refill', text: kes(priceOf({ ...l, kind: 'refill' })) },
                      { value: 'fresh', title: 'New cylinder', text: kes(priceOf({ ...l, kind: 'fresh' })) },
                    ]} />
                  <div className="line-fields">
                    <Field id={`brand-${l.id}`} label="Brand">
                      <select id={`brand-${l.id}`} value={l.brand} onChange={(e) => update(l.id, { brand: e.target.value })}>
                        <option value="">Any brand</option>
                        {brands.map((b) => (<option key={b}>{b}</option>))}
                      </select>
                    </Field>
                    <Field id={`qty-${l.id}`} label="Quantity">
                      <Stepper id={`qty-${l.id}`} value={l.qty} onChange={(n) => update(l.id, { qty: clampQty(n) })} />
                    </Field>
                  </div>
                </div>
              ))}
              {lines.length < 5 && (
                <button type="button" className="button button-soft" onClick={() => setLines((ls) => [...ls, { id: nextId++, size: sizes[0].kg, kind: 'refill', qty: 1, brand: '' }])}>
                  Add another item
                </button>
              )}
            </fieldset>

            <fieldset className="form-block">
              <legend><span className="step-no">2</span>Your details</legend>
              <div className="row2">
                <Field id="name" label="Full name" error={errors.name}>
                  <input id="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={!!errors.name} aria-describedby="name-note" />
                </Field>
                <Field id="phone" label="Phone number" error={errors.phone}>
                  <input id="phone" type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} aria-invalid={!!errors.phone} aria-describedby="phone-note" />
                </Field>
              </div>
              <div id="branch" tabIndex={-1}>
                <Choices name="branch" label="Branch" value={branchId} onChange={setBranchId}
                  options={branches.map((b) => ({ value: b.id, title: b.name, text: status(b).label }))} />
                {errors.branch && <p className="field-error" role="alert">{errors.branch}</p>}
              </div>
            </fieldset>

            <fieldset className="form-block">
              <legend><span className="step-no">3</span>Delivery and payment</legend>
              <Choices name="mode" label="How do you want it?" value={mode} onChange={setMode}
                options={[
                  { value: 'delivery', title: 'Delivery', text: 'A rider brings it to your door' },
                  { value: 'pickup', title: 'Pickup', text: 'Collect from the branch' },
                ]} />
              {mode === 'delivery' && (
                <Field id="location" label="Delivery location" error={errors.location} hint="Estate, road and a nearby landmark.">
                  <input id="location" autoComplete="street-address" value={location} onChange={(e) => setLocation(e.target.value)} aria-invalid={!!errors.location} aria-describedby="location-note" />
                </Field>
              )}
              <Choices name="payment" label="Payment" value={payment} onChange={setPayment}
                options={[{ value: 'M-Pesa on delivery', title: 'M-Pesa' }, { value: 'Cash on delivery', title: 'Cash' }]} />
              <Field id="note" label="Note (optional)">
                <textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} />
              </Field>
            </fieldset>
          </div>

          <aside className="panel order-summary" aria-label="Order summary">
            <h2 className="panel-title">Summary</h2>
            <dl className="kv">
              {lines.map((l) => (
                <div key={l.id}><dt>{l.qty} x {l.size} kg {l.kind === 'refill' ? 'refill' : 'new'}</dt><dd>{kes(priceOf(l) * l.qty)}</dd></div>
              ))}
              <div><dt>Cylinders total</dt><dd><strong>{kes(total)}</strong></dd></div>
              <div><dt>Delivery</dt><dd>{mode === 'pickup' ? 'None' : chosen ? kes(chosen.delivery.fee) : 'Choose a branch'}</dd></div>
            </dl>
            <p className="panel-note">The branch confirms the final price, brand availability and timing on WhatsApp.</p>
            <button type="submit" className="button button-dark panel-action" disabled={sending}>{sending ? 'Saving your order…' : 'Send order on WhatsApp'}</button>
            <p className="panel-note">We save your order details so the branch can process and track it.</p>
          </aside>
        </form>
      </section>
    </>
  );
}
