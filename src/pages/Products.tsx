import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSettings } from '../settings';
import { categoryLabel, useCatalog } from '../api';
import type { Category } from '../api';
import { kes, usePageTitle } from '../lib';
import { Cylinder, PageHead } from '../ui';

const colours = ['pink', 'yellow', 'blue'];

export default function Products() {
  usePageTitle('Products and prices');
  const { brands, sizes } = useSettings();
  const standardSize = (s: string) => sizes.some((x) => x.kg === s);
  const items = useCatalog();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<'all' | Category>('all');

  const categories = useMemo(() => Array.from(new Set(items.map((p) => p.category))), [items]);
  const results = useMemo(() => {
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    return items.filter((p) => {
      if (cat !== 'all' && p.category !== cat) return false;
      const hay = [p.name, p.brand, categoryLabel[p.category], p.size && `${p.size}kg ${p.size} kg`, p.description].join(' ').toLowerCase();
      return terms.every((t) => hay.includes(t));
    });
  }, [items, q, cat]);

  return (
    <>
      <PageHead eyebrow="PRODUCTS AND PRICES" title={<>WE'RE FIRED UP, <em>LITERALLY.</em>CHOOSE YOUR <em>GEAR.</em></>} lead="Search for a size, brand or accessory. Prices are per item." />

      <section className="page-body">
        <form className="search" role="search" onSubmit={(e) => e.preventDefault()}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
          <input type="search" aria-label="Search products" placeholder="Search by name, brand or size" value={q} onChange={(e) => setQ(e.target.value)} enterKeyHint="search" autoComplete="off" />
          {q && <button type="button" className="search-clear" aria-label="Clear search" onClick={() => setQ('')}>×</button>}
        </form>

        <div className="pills" role="group" aria-label="Filter by category">
          <button type="button" className="pill-btn" aria-pressed={cat === 'all'} onClick={() => setCat('all')}>All</button>
          {categories.map((c) => (
            <button key={c} type="button" className="pill-btn" aria-pressed={cat === c} onClick={() => setCat(c)}>{categoryLabel[c]}</button>
          ))}
        </div>
        <p className="search-meta" aria-live="polite">{results.length} {results.length === 1 ? 'product' : 'products'}{q.trim() && ` for “${q.trim()}”`}</p>

        {results.length === 0 ? (
          <div className="panel">
            <h2 className="panel-title">Nothing matches that.</h2>
            <p className="panel-note">Try a shorter search, a size such as “13”, or a brand name. If you can’t find it, ask your branch.</p>
            <button type="button" className="button button-dark panel-action" onClick={() => { setQ(''); setCat('all'); }}>Clear search</button>
          </div>
        ) : (
          <div className="product-grid product-grid-4">
            {results.map((p, i) => {
              const orderable = p.category === 'cylinder' && standardSize(p.size);
              return (
                <article key={p.id} className={`product-card product-${colours[i % 3]}`}>
                  <div className="product-card-top">
                    <span className="product-tag">{p.inStock ? categoryLabel[p.category].toUpperCase() : 'OUT OF STOCK'}</span>
                  </div>
                  <div className={`product-illustration${p.images[0] ? ' has-photo' : ''}`}>
                    {p.images[0] ? <img src={p.images[0]} alt={p.name} loading="lazy" /> : <Cylinder colour={colours[i % 3]} small />}
                  </div>
                  <div className="product-info">
                    <p className="product-size">{[p.brand, p.size && `${p.size} KG`].filter(Boolean).join(' · ').toUpperCase() || categoryLabel[p.category].toUpperCase()}</p>
                    <h3>{p.name}</h3>
                    <p className="price-lines">
                      {p.refillPrice !== null && <span>Refill <strong>{kes(p.refillPrice)}</strong></span>}
                      <span>{p.category === 'cylinder' ? 'New' : 'Price'} <strong>{kes(p.price)}</strong></span>
                    </p>
                    {p.description && <p className="card-desc">{p.description}</p>}
                  </div>
                  {orderable ? (
                    <>
                      {p.refillPrice !== null && <Link to={`/order?size=${p.size}&type=refill`} className="product-link">Order refill <span>↗</span></Link>}
                      <Link to={`/order?size=${p.size}&type=fresh`} className="product-link">Order new cylinder <span>↗</span></Link>
                    </>
                  ) : (
                    <Link to={`/order?accessory=${encodeURIComponent(p.name)}`} className="product-link">Ask about this <span>↗</span></Link>
                  )}
                </article>
              );
            })}
          </div>
        )}
        <p className="product-note">Brands we work with include {brands.join(', ')}. Stock can differ by branch, so we confirm when you order.</p>
      </section>
    </>
  );
}
