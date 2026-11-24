import { useSettings } from '../settings';
import { t12, useBranch, usePageTitle, waLink } from '../lib';
import { BranchPicker, OpenBadge, PageHead } from '../ui';

export default function Contact() {
  usePageTitle('Contact');
  const { branches, business } = useSettings();
  const { branch, setBranch } = useBranch();
  const b = branch ?? branches[0];
  const q = encodeURIComponent(b.query);
  const ext = { target: '_blank', rel: 'noopener noreferrer' } as const;

  return (
    <>
      <PageHead eyebrow="CONTACT" title={<>LET'S TALK <em>GAS.</em></>} lead="Call, message or visit. Pick your branch for its own number, hours and map." />

      <section className="page-body">
        <BranchPicker value={b.id} onChange={setBranch} />

        <div className="two-col">
          <div className="panel">
            <h2 className="panel-title">{b.name} branch</h2>
            <OpenBadge branch={b} />
            <div className="actions">
              <a className="button button-dark" href={`tel:${b.phone}`}>Call {b.name}</a>
              <a className="button button-soft" href={waLink(b.whatsapp, 'Hello, I have a question.')} {...ext}>WhatsApp</a>
              <a className="button button-soft" href={`https://www.google.com/maps/dir/?api=1&destination=${q}`} {...ext}>Directions</a>
            </div>
            <dl className="kv">
              <div><dt>Phone</dt><dd>{b.phone}</dd></div>
              <div><dt>Email</dt><dd><a className="inline-link" href={`mailto:${business.email}`}>{business.email}</a></dd></div>
              <div><dt>Monday to Friday</dt><dd>{t12(b.hours.weekday[0])} to {t12(b.hours.weekday[1])}</dd></div>
              <div><dt>Saturday</dt><dd>{t12(b.hours.sat[0])} to {t12(b.hours.sat[1])}</dd></div>
              <div><dt>Sunday</dt><dd>{t12(b.hours.sun[0])} to {t12(b.hours.sun[1])}</dd></div>
            </dl>
            <div className="actions">
              {business.socials.map((s) => (<a key={s.label} className="button button-soft" href={s.href} {...ext}>{s.label}</a>))}
            </div>
          </div>

          <iframe
            key={b.id}
            className="map-frame"
            title={`Map showing ${b.name} branch`}
            src={`https://www.google.com/maps?q=${q}&output=embed`}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </section>
    </>
  );
}
