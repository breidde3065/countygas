import { Link } from 'react-router-dom';
import { useSettings } from '../settings';
import { kes, t12, useBranch, usePageTitle } from '../lib';
import { BranchPicker, OpenBadge, PageHead } from '../ui';

export default function Delivery() {
  usePageTitle('Delivery');
  const { branches } = useSettings();
  const { branch, setBranch } = useBranch();
  const b = branch ?? branches[0];

  return (
    <>
      <PageHead eyebrow="DELIVERY AND SERVICE AREA" title={<>WE BRING<em> THE HEAT.</em> YOU BRING <em>THE RECIPE.</em></>} lead="Choose your nearest branch to see its delivery fee, timing and hours." />

      <section className="page-body">
        <BranchPicker value={b.id} onChange={setBranch} />

        <div className="two-col">
          <div className="panel">
            <h2 className="panel-title">{b.name} branch</h2>
            <OpenBadge branch={b} />
            <dl className="kv">
              <div><dt>Delivery fee</dt><dd>{kes(b.delivery.fee)}</dd></div>
              <div><dt>Usual delivery time</dt><dd>{b.delivery.time}</dd></div>
              <div><dt>Same-day cut-off</dt><dd>Order before {b.delivery.cutoff}</dd></div>
              <div><dt>Areas we deliver to</dt><dd>{b.delivery.areas.length ? b.delivery.areas.join(', ') : 'Call the branch to confirm your area'}</dd></div>
            </dl>
            <Link className="button button-dark panel-action" to="/order">ORDER FROM {b.name.toUpperCase()} <span>↗</span></Link>
          </div>

          <div className="panel">
            <h2 className="panel-title">Opening hours</h2>
            <dl className="kv">
              <div><dt>Monday to Friday</dt><dd>{t12(b.hours.weekday[0])} to {t12(b.hours.weekday[1])}</dd></div>
              <div><dt>Saturday</dt><dd>{t12(b.hours.sat[0])} to {t12(b.hours.sat[1])}</dd></div>
              <div><dt>Sunday</dt><dd>{t12(b.hours.sun[0])} to {t12(b.hours.sun[1])}</dd></div>
            </dl>
            <p className="panel-note">Orders placed after the cut-off are delivered the next morning.</p>
          </div>
        </div>
      </section>
    </>
  );
}
