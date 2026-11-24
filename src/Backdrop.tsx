import { useEffect, useRef } from 'react';
import type { CSSProperties, ReactElement } from 'react';

type Kind = 'squiggle' | 'zigzag' | 'triangle' | 'ring' | 'dots' | 'plus' | 'half';
type Move = 'spin' | 'bob' | 'sway' | 'pulse';
type Colour = 'ink' | 'pink' | 'yellow' | 'blue' | 'green' | 'paper';
// kind, left %, top %, size px, colour, parallax speed, motion, seconds per loop, start offset
type Shape = [Kind, number, number, number, Colour, number, Move, number, number];

const layouts: Record<string, Shape[]> = {
  hero: [
    ['squiggle', 2, 12, 120, 'paper', 0.12, 'sway', 7, 0],
    ['triangle', 47, 6, 54, 'yellow', -0.1, 'bob', 6, 2],
    ['ring', 90, 10, 64, 'ink', 0.08, 'pulse', 22, 0],
    ['dots', 2, 66, 90, 'green', -0.08, 'spin', 13, 1],
    ['plus', 48, 84, 36, 'blue', 0.14, 'spin', 16, 3],
    ['half', 88, 70, 76, 'green', -0.12, 'bob', 8, 4],
    ['zigzag', 56, 32, 90, 'paper', 0.1, 'sway', 9, 1],
  ],
  intro: [
    ['squiggle', 4, 82, 110, 'pink', 0.1, 'sway', 8, 0],
    ['triangle', 88, 10, 52, 'blue', -0.12, 'bob', 7, 1],
    ['ring', 52, 4, 56, 'yellow', 0.08, 'spin', 24, 0],
    ['dots', 92, 70, 84, 'blue', -0.06, 'pulse', 5, 2],
    ['plus', 30, 90, 32, 'ink', 0.12, 'spin', 15, 3],
  ],
  products: [
    ['ring', 3, 6, 70, 'paper', 0.1, 'spin', 26, 0],
    ['triangle', 92, 82, 60, 'pink', -0.1, 'bob', 7, 2],
    ['zigzag', 40, 94, 100, 'ink', 0.08, 'sway', 9, 0],
    ['plus', 94, 4, 40, 'blue', 0.14, 'spin', 14, 1],
    ['dots', 1, 80, 90, 'ink', -0.08, 'pulse', 6, 3],
    ['half', 60, 2, 64, 'pink', -0.1, 'bob', 8, 2],
  ],
  services: [
    ['ring', 94, 8, 60, 'pink', 0.1, 'spin', 22, 0],
    ['triangle', 92, 88, 56, 'yellow', -0.12, 'bob', 6, 1],
    ['dots', 46, 2, 84, 'blue', 0.06, 'pulse', 5, 0],
    ['plus', 2, 92, 34, 'ink', 0.12, 'spin', 16, 2],
    ['squiggle', 50, 94, 110, 'green', 0.08, 'sway', 8, 3],
  ],
  branches: [
    ['ring', 4, 8, 66, 'yellow', 0.1, 'spin', 24, 0],
    ['triangle', 90, 8, 58, 'pink', -0.1, 'bob', 7, 2],
    ['zigzag', 44, 92, 100, 'paper', 0.08, 'sway', 9, 1],
    ['plus', 95, 60, 36, 'ink', 0.14, 'spin', 15, 3],
    ['dots', 2, 86, 90, 'yellow', -0.06, 'pulse', 5, 0],
  ],
  contact: [
    ['plus', 8, 12, 40, 'yellow', 0.12, 'spin', 16, 0],
    ['triangle', 88, 76, 64, 'blue', -0.1, 'bob', 7, 1],
    ['squiggle', 60, 10, 120, 'ink', 0.1, 'sway', 8, 2],
    ['ring', 4, 70, 70, 'paper', 0.08, 'spin', 24, 0],
    ['half', 80, 8, 70, 'green', -0.12, 'bob', 8, 3],
    ['dots', 46, 88, 90, 'ink', -0.06, 'pulse', 5, 1],
  ],
};

const line = { fill: 'none', stroke: 'var(--c)', strokeWidth: 9, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
const solid = { fill: 'var(--c)', stroke: 'var(--ink)', strokeWidth: 5, strokeLinejoin: 'round' } as const;

const art: Record<Kind, ReactElement> = {
  squiggle: <path d="M2 50 Q14 20 26 50 T50 50 T74 50 T98 50" {...line} />,
  zigzag: <polyline points="2,70 18,30 34,70 50,30 66,70 82,30 98,70" {...line} />,
  triangle: <polygon points="50,8 94,88 6,88" {...solid} />,
  ring: <circle cx="50" cy="50" r="38" fill="none" stroke="var(--c)" strokeWidth="14" />,
  dots: (
    <g fill="var(--c)">
      {[20, 50, 80].flatMap((cx) => [20, 50, 80].map((cy) => <circle key={`${cx}${cy}`} cx={cx} cy={cy} r="7" />))}
    </g>
  ),
  plus: <path d="M40 6h20v34h34v20H60v34H40V60H6V40h34z" {...solid} />,
  half: <path d="M6 70a44 44 0 0 1 88 0z" {...solid} />,
};

export default function Backdrop({ variant }: { variant: keyof typeof layouts }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    const host = el?.parentElement;
    if (!el || !host || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const r = host.getBoundingClientRect();
      if (r.bottom < -200 || r.top > window.innerHeight + 200) return;
      el.style.setProperty('--p', `${r.top + r.height / 2 - window.innerHeight / 2}px`);
    };
    const onMove = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onMove, { passive: true });
    window.addEventListener('resize', onMove);
    return () => {
      window.removeEventListener('scroll', onMove);
      window.removeEventListener('resize', onMove);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className="backdrop" ref={ref} aria-hidden="true">
      {(layouts[variant] ?? []).map(([k, x, y, s, c, sp, m, t, d], i) => (
        <svg
          key={i}
          className={`bd-shape bd-${m}`}
          viewBox="0 0 100 100"
          style={{ '--x': `${x}%`, '--y': `${y}%`, '--s': `${s}px`, '--c': `var(--${c})`, '--sp': sp, '--t': `${t}s`, '--d': `-${d}s` } as CSSProperties}
        >
          {art[k]}
        </svg>
      ))}
    </div>
  );
}
