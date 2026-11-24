import { useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../api';
import type { Branch, Business, Settings, Size } from '../data';
import { useReloadSettings, useSettings } from '../settings';
import { Field } from '../ui';

type Props = { onLogout: () => void };
type Save = ReturnType<typeof useSave>;

function useSave(onLogout: () => void) {
  const reload = useReloadSettings();
  const [state, setState] = useState({ saving: false, error: '', saved: false });
  const save = async (next: Settings) => {
    setState({ saving: true, error: '', saved: false });
    try {
      await api('/api/admin/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(next) });
      reload();
      setState({ saving: false, error: '', saved: true });
    } catch (e) {
      const x = e as Error & { status?: number };
      if (x.status === 401) onLogout();
      else setState({ saving: false, error: x.message, saved: false });
    }
  };
  return { ...state, save, clear: () => setState((s) => ({ ...s, saved: false })) };
}

function SaveBar({ s, label }: { s: Save; label: string }) {
  return (
    <div className="save-bar">
      <button type="submit" className="button button-dark" disabled={s.saving}>{s.saving ? 'Saving…' : label}</button>
      {s.error && <p className="field-error" role="alert">{s.error}</p>}
      {s.saved && <p className="save-ok" role="status">Saved. The site is updated.</p>}
    </div>
  );
}

const toInt = (v: string) => Number(v.replace(/\D/g, '')) || 0;

/* ---------------------------------- Business ---------------------------------- */
export function BusinessTab({ onLogout }: Props) {
  const settings = useSettings();
  const s = useSave(onLogout);
  const [d, setD] = useState<Business>(structuredClone(settings.business));
  const [brands, setBrands] = useState(settings.brands.join(', '));
  const set = (k: keyof Business) => (e: { target: { value: string } }) => { s.clear(); setD({ ...d, [k]: e.target.value }); };
  const social = (i: number, k: 'label' | 'href', v: string) => setD({ ...d, socials: d.socials.map((x, j) => (j === i ? { ...x, [k]: v } : x)) });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    s.save({ ...settings, business: d, brands: brands.split(',').map((b) => b.trim()).filter(Boolean) });
  };

  return (
    <form className="panel" onSubmit={submit} noValidate>
      <h2 className="panel-title">Business details</h2>
      <div className="row2">
        <Field id="b-name" label="Business name"><input id="b-name" value={d.name} onChange={set('name')} /></Field>
        <Field id="b-founded" label="Year started" hint="Drives “years in business” on the About page."><input id="b-founded" inputMode="numeric" value={d.founded || ''} onChange={(e) => setD({ ...d, founded: toInt(e.target.value) })} /></Field>
      </div>
      <Field id="b-pitch" label="Tagline"><input id="b-pitch" value={d.pitch} onChange={set('pitch')} /></Field>
      <Field id="b-announce" label="Top bar message" hint="Use it for notices such as holiday closures. Leave empty to hide the bar."><input id="b-announce" value={d.announcement} onChange={set('announcement')} maxLength={120} /></Field>
      <div className="row2">
        <Field id="b-phone" label="Main phone"><input id="b-phone" type="tel" inputMode="tel" value={d.phone} onChange={set('phone')} /></Field>
        <Field id="b-wa" label="Main WhatsApp" hint="With country code, for example 254712345678."><input id="b-wa" inputMode="numeric" value={d.whatsapp} onChange={set('whatsapp')} /></Field>
      </div>
      <Field id="b-email" label="Email"><input id="b-email" type="email" inputMode="email" value={d.email} onChange={set('email')} /></Field>
      <Field id="b-brands" label="Brands you stock" hint="Separate with commas."><input id="b-brands" value={brands} onChange={(e) => setBrands(e.target.value)} /></Field>

      <p className="field-label">Social links</p>
      {d.socials.map((x, i) => (
        <div className="social-row" key={i}>
          <Field id={`soc-n-${i}`} label="Name"><input id={`soc-n-${i}`} value={x.label} onChange={(e) => social(i, 'label', e.target.value)} /></Field>
          <Field id={`soc-u-${i}`} label="Link"><input id={`soc-u-${i}`} type="url" inputMode="url" placeholder="https://" value={x.href} onChange={(e) => social(i, 'href', e.target.value)} /></Field>
          <button type="button" className="linkish" onClick={() => setD({ ...d, socials: d.socials.filter((_, j) => j !== i) })}>Remove</button>
        </div>
      ))}
      {d.socials.length < 6 && <button type="button" className="button button-soft" onClick={() => setD({ ...d, socials: [...d.socials, { label: '', href: '' }] })}>Add link</button>}
      <SaveBar s={s} label="Save business details" />
    </form>
  );
}

/* ---------------------------------- Branches ---------------------------------- */
type BDraft = Omit<Branch, 'delivery'> & { delivery: Omit<Branch['delivery'], 'areas'> & { areas: string } };
const HOURS = [['weekday', 'Monday to Friday'], ['sat', 'Saturday'], ['sun', 'Sunday']] as const;
const toDraft = (b: Branch): BDraft => ({ ...structuredClone(b), delivery: { ...b.delivery, areas: b.delivery.areas.join(', ') } });
const blank = (): BDraft => ({
  id: '', name: 'New branch', phone: '', whatsapp: '', query: '',
  hours: { weekday: ['07:00', '21:00'], sat: ['07:00', '21:00'], sun: ['08:00', '17:00'] },
  delivery: { areas: '', fee: 150, time: '30 to 60 minutes', cutoff: '6 pm' },
});

export function BranchesTab({ onLogout }: Props) {
  const settings = useSettings();
  const s = useSave(onLogout);
  const [rows, setRows] = useState<BDraft[]>(settings.branches.map(toDraft));
  const [removing, setRemoving] = useState<number | null>(null);
  const [fresh, setFresh] = useState<number | null>(null);

  const edit = (i: number, fn: (b: BDraft) => BDraft) => { s.clear(); setRows((rs) => rs.map((r, j) => (j === i ? fn(r) : r))); };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const branches: Branch[] = rows.map((r) => ({ ...r, delivery: { ...r.delivery, areas: r.delivery.areas.split(',').map((a) => a.trim()).filter(Boolean) } }));
    s.save({ ...settings, branches });
  };

  return (
    <form onSubmit={submit} noValidate>
      <div className="admin-bar">
        <h2 className="panel-title">{rows.length} branch{rows.length === 1 ? '' : 'es'}</h2>
        <button type="button" className="button button-soft" onClick={() => { setRows([...rows, blank()]); setFresh(rows.length); }}>Add branch</button>
      </div>

      {rows.map((r, i) => (
        <details className="admin-branch" key={r.id || `new-${i}`} open={fresh === i || undefined}>
          <summary><strong>{r.name || 'Unnamed branch'}</strong><span>{r.phone}</span></summary>
          <div className="body">
            <div className="row2">
              <Field id={`b${i}-name`} label="Branch name"><input id={`b${i}-name`} value={r.name} onChange={(e) => edit(i, (b) => ({ ...b, name: e.target.value }))} /></Field>
              <Field id={`b${i}-phone`} label="Phone"><input id={`b${i}-phone`} type="tel" inputMode="tel" value={r.phone} onChange={(e) => edit(i, (b) => ({ ...b, phone: e.target.value }))} /></Field>
            </div>
            <div className="row2">
              <Field id={`b${i}-wa`} label="WhatsApp" hint="With country code, for example 254712345678."><input id={`b${i}-wa`} inputMode="numeric" value={r.whatsapp} onChange={(e) => edit(i, (b) => ({ ...b, whatsapp: e.target.value }))} /></Field>
              <Field id={`b${i}-q`} label="Google Maps name" hint="The exact name on this branch’s Google Business Profile."><input id={`b${i}-q`} value={r.query} onChange={(e) => edit(i, (b) => ({ ...b, query: e.target.value }))} /></Field>
            </div>

            <p className="field-label">Opening hours</p>
            {HOURS.map(([key, label]) => (
              <div className="hours-row" key={key}>
                <span>{label}</span>
                <input type="time" aria-label={`${label} opens`} value={r.hours[key][0]} onChange={(e) => edit(i, (b) => ({ ...b, hours: { ...b.hours, [key]: [e.target.value, b.hours[key][1]] } }))} />
                <input type="time" aria-label={`${label} closes`} value={r.hours[key][1]} onChange={(e) => edit(i, (b) => ({ ...b, hours: { ...b.hours, [key]: [b.hours[key][0], e.target.value] } }))} />
              </div>
            ))}

            <p className="field-label">Delivery</p>
            <div className="row3">
              <Field id={`b${i}-fee`} label="Fee (KES)"><input id={`b${i}-fee`} inputMode="numeric" value={r.delivery.fee} onChange={(e) => edit(i, (b) => ({ ...b, delivery: { ...b.delivery, fee: toInt(e.target.value) } }))} /></Field>
              <Field id={`b${i}-time`} label="Usual time"><input id={`b${i}-time`} value={r.delivery.time} onChange={(e) => edit(i, (b) => ({ ...b, delivery: { ...b.delivery, time: e.target.value } }))} /></Field>
              <Field id={`b${i}-cut`} label="Same-day cut-off"><input id={`b${i}-cut`} value={r.delivery.cutoff} onChange={(e) => edit(i, (b) => ({ ...b, delivery: { ...b.delivery, cutoff: e.target.value } }))} /></Field>
            </div>
            <Field id={`b${i}-areas`} label="Areas delivered to" hint="Separate with commas."><input id={`b${i}-areas`} value={r.delivery.areas} onChange={(e) => edit(i, (b) => ({ ...b, delivery: { ...b.delivery, areas: e.target.value } }))} /></Field>

            {rows.length > 1 && (removing === i ? (
              <div className="actions">
                <button type="button" className="button button-dark" onClick={() => { setRows(rows.filter((_, j) => j !== i)); setRemoving(null); }}>Confirm remove</button>
                <button type="button" className="button button-soft" onClick={() => setRemoving(null)}>Cancel</button>
              </div>
            ) : (
              <button type="button" className="linkish" onClick={() => setRemoving(i)}>Remove this branch</button>
            ))}
          </div>
        </details>
      ))}
      <SaveBar s={s} label="Save branches" />
    </form>
  );
}

/* ----------------------------------- Prices ----------------------------------- */
export function PricesTab({ onLogout }: Props) {
  const settings = useSettings();
  const s = useSave(onLogout);
  const [rows, setRows] = useState<Size[]>(structuredClone(settings.sizes));
  const edit = (i: number, patch: Partial<Size>) => { s.clear(); setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r))); };

  const submit = (e: FormEvent) => { e.preventDefault(); s.save({ ...settings, sizes: rows }); };

  return (
    <form className="panel" onSubmit={submit} noValidate>
      <h2 className="panel-title">Standard cylinder prices</h2>
      <p className="panel-note">These are the prices on the order form and the default price list. A product you add under Products with the same size overrides them for that brand.</p>
      {rows.map((r, i) => (
        <div className="size-row" key={i}>
          <Field id={`s${i}-kg`} label="Size (kg)"><input id={`s${i}-kg`} inputMode="decimal" value={r.kg} onChange={(e) => edit(i, { kg: e.target.value })} /></Field>
          <Field id={`s${i}-refill`} label="Refill (KES)"><input id={`s${i}-refill`} inputMode="numeric" value={r.refill} onChange={(e) => edit(i, { refill: toInt(e.target.value) })} /></Field>
          <Field id={`s${i}-fresh`} label="New (KES)"><input id={`s${i}-fresh`} inputMode="numeric" value={r.fresh} onChange={(e) => edit(i, { fresh: toInt(e.target.value) })} /></Field>
          <Field id={`s${i}-use`} label="Good for"><input id={`s${i}-use`} value={r.use} onChange={(e) => edit(i, { use: e.target.value })} /></Field>
          {rows.length > 1 && <button type="button" className="linkish" onClick={() => setRows(rows.filter((_, j) => j !== i))}>Remove</button>}
        </div>
      ))}
      {rows.length < 12 && <button type="button" className="button button-soft" onClick={() => setRows([...rows, { kg: '', refill: 0, fresh: 0, use: '' }])}>Add size</button>}
      <SaveBar s={s} label="Save prices" />
    </form>
  );
}
