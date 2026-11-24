import { Link } from 'react-router-dom';
import { useSettings } from '../settings';
import { usePageTitle } from '../lib';
import { PageHead } from '../ui';

const trust = [
  { title: 'EPRA licensed', text: 'We operate under licence from the Energy and Petroleum Regulatory Authority.' },
  { title: 'Checked before it leaves', text: 'Every cylinder is inspected for leaks and valve damage before dispatch.' },
  { title: 'Trained riders', text: 'Our delivery team is briefed on safe handling and what to do if something goes wrong.' },
];

export default function About() {
  usePageTitle('About us');
  const { branches, business } = useSettings();
  const years = new Date().getFullYear() - business.founded;
  return (
    <>
      <PageHead eyebrow="ABOUT US" title={<>ENERGY <em>IS</em> OUR <em>LOVE </em>LANG<em>UAGE</em></>} lead="County Gas supplies LPG for homes, eateries and institutions through six branches." />

      <section className="page-body">
        <div className="stats">
          <div><strong>{years}+</strong><span>YEARS IN BUSINESS</span></div>
          <div><strong>{branches.length}</strong><span>BRANCHES</span></div>
          <div><strong>7 days</strong><span>A WEEK</span></div>
        </div>

        <div className="two-col block-gap">
          <div className="prose">
            <p className="eyebrow">OUR STORY</p>
            <p>
              From the morning tea to the family dinner, the little moments matter. We started County Gas to make it easier
              to get the gas you need, from people you can reach and a branch close to where you live.
            </p>
            <p>
              We keep things simple: fair prices, clean cylinders, honest timing, and a team that picks up the phone.
            </p>
            <Link className="button button-dark" to="/contact">TALK TO A BRANCH <span>↗</span></Link>
          </div>
          <div>
            <p className="eyebrow">WHY YOU CAN TRUST US</p>
            <ul className="steps no-count">
              {trust.map((t) => (
                <li key={t.title}><div><strong>{t.title}</strong><br />{t.text}</div></li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
