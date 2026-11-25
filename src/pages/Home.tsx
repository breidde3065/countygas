import { Link } from 'react-router-dom';
import Backdrop from '../Backdrop';
import { useSettings } from '../settings';
import { usePageTitle } from '../lib';
import { Cylinder, Pop } from '../ui';

const stripItems = ['RELIABLE LPG', 'CYLINDER EXCHANGE', 'DELIVERY', 'GOOD ENERGY'];

const services = [
  { index: '01 / EXCHANGE', title: ['EMPTY IN.', 'FULL OUT.'], text: 'Bring in your empty cylinder and swap it for a full one.', to: '/products', icon: '↻' },
  { index: '02 / PURCHASE', title: ['GET YOUR', 'FIRST CYLINDER.'], text: 'Starting out? Buy a full cylinder, regulator and burner in one stop.', to: '/products', icon: '✳' },
  { index: '03 / DELIVERY', title: ['GAS TO', 'YOUR DOOR.'], text: 'Pick your branch to see delivery fees and times for your area.', to: '/delivery', icon: '➜' },
];

export default function Home() {
  usePageTitle();
  const { branches } = useSettings();
  return (
    <>
      <section className="hero" id="home" data-scroll-color="#ff668c">
        <Backdrop variant="hero" />
        <div className="hero-copy">
          <Pop>
          <div className="eyebrow"><span /> YOUR HOME. YOUR ENERGY. OUR PROMISE.</div>
          <h1>LET'S KEEP <br /><span>THINGS</span> <em>COOKING.</em></h1>
          <p className="hero-description">
            Everyday energy for the things that matter. Get your LPG, exchange your cylinder and keep your kitchen moving with County Gas.
          </p>
          <div className="hero-actions">
            <Link className="button button-dark" to="/order">ORDER GAS <span>↗</span></Link>
            <Link className="button button-light" to="/products">SEE PRICES <span>→</span></Link>
          </div>
          </Pop>
        </div>
        <div className="hero-art">
          <div className="hero-sun" />
          <div className="hero-orbit orbit-one" />
          <div className="hero-orbit orbit-two" />
          <div className="hero-label label-top"><Pop>FULL OF<br />POSSIBILITIES!</Pop></div>
          <div className="hero-cylinder-wrap"><Cylinder colour="yellow" /></div>
          <div className="hero-sticker"><Pop>LET'S<br />GET<br /><strong>COOKING!</strong></Pop></div>
        </div>
        <div className="hero-bottom-strip" aria-hidden="true">
          <div className="marquee-track">
            {[0, 1].map((n) => (
              <div className="marquee-group" key={n}>
                {stripItems.map((t) => (<span key={t}>{t} <b>✳</b></span>))}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="services section-pad" data-scroll-color="#fff9ec">
        <Backdrop variant="services" />
        <div className="services-heading">
          <p className="eyebrow">HOW CAN WE HELP?</p>
          <h2>WE KEEP<br />THINGS <span>FLOWING.</span></h2>
        </div>
        <div className="service-list">
          {services.map((s) => (
            <Link key={s.index} to={s.to} className="service-item">
              <span className="service-icon">{s.icon}</span>
              <div>
                <span className="service-index">{s.index}</span>
                <h3>{s.title[0]}<br />{s.title[1]}</h3>
                <p>{s.text}</p>
              </div>
              <span className="service-arrow">↗</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="branches section-pad" data-scroll-color="#647cff">
        <Backdrop variant="branches" />
        <div className="branches-art">
          <div className="branch-big-type">CLOSE<br />TO<br /><em>YOU.</em></div>
          <div className="branch-circle">{branches.length}<br /><span>BRANCHES</span></div>
        </div>
        <div className="branches-copy">
          <p className="eyebrow">WHEREVER YOU ARE</p>
          <h2>GOOD GAS<br />IS <span>NEARBY.</span></h2>
          <p>{branches.map((b) => b.name).join(', ')}. Choose your branch for hours, delivery fees and directions.</p>
          <Link className="button button-dark" to="/contact">FIND YOUR BRANCH <span>↗</span></Link>
        </div>
      </section>
    </>
  );
}
