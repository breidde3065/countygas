import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import type { Branch, Business } from './data';
import { useSettings } from './settings';
import { useBranch, waLink } from './lib';
import ScrollBackground from './ScrollBackground';

const links = [
  { to: '/products', label: 'PRODUCTS' },
  { to: '/delivery', label: 'DELIVERY' },
  { to: '/about', label: 'ABOUT' },
  { to: '/safety', label: 'SAFETY' },
  { to: '/contact', label: 'CONTACT' },
];

const buildSchema = (business: Business, branches: Branch[]) => ({
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: business.name,
  email: business.email,
  sameAs: business.socials.map((s) => s.href),
  department: branches.map((b) => ({
    '@type': 'LocalBusiness',
    name: `${business.name} ${b.name}`,
    telephone: b.phone,
    hasMap: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(b.query)}`,
  })),
});

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();
  const { branch } = useBranch();
  const { business, branches } = useSettings();
  const schema = buildSchema(business, branches);

  useEffect(() => {
    setMenuOpen(false);
    window.scrollTo(0, 0);
  }, [pathname]);

  // Keep focused fields visible above the on-screen keyboard and hide the fixed bar while typing.
  useEffect(() => {
    const isField = (t: EventTarget | null): t is HTMLElement => t instanceof HTMLElement && t.matches('input, select, textarea');
    const onIn = (e: FocusEvent) => {
      if (!isField(e.target)) return;
      const el = e.target;
      document.body.classList.add('typing');
      window.setTimeout(() => el.scrollIntoView({ block: 'center', behavior: 'smooth' }), 300);
    };
    const onOut = () => document.body.classList.remove('typing');
    document.addEventListener('focusin', onIn);
    document.addEventListener('focusout', onOut);
    return () => {
      document.removeEventListener('focusin', onIn);
      document.removeEventListener('focusout', onOut);
    };
  }, []);

  const phone = branch?.phone ?? business.phone;
  const whatsapp = branch?.whatsapp ?? business.whatsapp;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <ScrollBackground />
      {business.announcement && (
        <div className="announcement">
          <span className="announcement-star">✳</span>
          {business.announcement}
          <span className="announcement-star">✳</span>
        </div>
      )}

      <header className="site-header">
        <Link className="brand" to="/" aria-label="County Gas home">
          <span className="brand-mark">C<span>✳</span></span>
          <span className="brand-name">COUNTY<span>GAS.</span></span>
        </Link>
        <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle navigation" aria-expanded={menuOpen}>
          {menuOpen ? 'CLOSE ×' : 'MENU +'}
        </button>
        <nav className={menuOpen ? 'nav-links nav-open' : 'nav-links'} aria-label="Main">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to}>{l.label}</NavLink>
          ))}
          <Link className="nav-cta" to="/order">ORDER NOW <span>↗</span></Link>
        </nav>
      </header>

      <main>
        <Outlet />
      </main>

      <footer className="site-footer">
        <div className="footer-grid">
          <div>
            <p className="footer-title">{business.name.toUpperCase()}</p>
            <p>{business.pitch}</p>
            <p><a href={`tel:${business.phone}`}>{business.phone}</a><br /><a href={`mailto:${business.email}`}>{business.email}</a></p>
          </div>
          <div>
            <p className="footer-title">PAGES</p>
            {links.map((l) => (<Link key={l.to} to={l.to}>{l.label.charAt(0) + l.label.slice(1).toLowerCase()}</Link>))}
            <Link to="/order">Order</Link>
          </div>
          <div>
            <p className="footer-title">FOLLOW US</p>
            {business.socials.map((s) => (<a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer">{s.label}</a>))}
          </div>
        </div>
        <small>© {new Date().getFullYear()} {business.name.toUpperCase()}. ALL RIGHTS RESERVED.</small>
      </footer>

      <nav className="mobile-bar" aria-label="Quick actions">
        <a href={`tel:${phone}`}>CALL</a>
        <a href={waLink(whatsapp, 'Hello, I need gas.')} target="_blank" rel="noopener noreferrer">WHATSAPP</a>
        <Link to="/order">ORDER</Link>
        <Link to="/track">Track an order</Link>
      </nav>
    </>
  );
}
