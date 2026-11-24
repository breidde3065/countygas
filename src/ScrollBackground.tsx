import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const TOKENS = { pink: '#ff668c', paper: '#fff9ec', yellow: '#ffd84d', blue: '#647cff' };

/** Hex colour a section wants behind it. Set data-scroll-color="#rrggbb" on a section to choose it. */
const colourOf = (el: HTMLElement) => {
  if (el.dataset.scrollColor) return el.dataset.scrollColor;
  const c = el.classList;
  if (c.contains('hero') || c.contains('page-head')) return TOKENS.pink;
  if (c.contains('branches')) return TOKENS.blue;
  if (c.contains('products')) return TOKENS.yellow;
  return TOKENS.paper;
};

const channels = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const mix = (from: string, to: string, t: number) => {
  const a = channels(from);
  const b = channels(to);
  return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(', ')})`;
};

/** One fixed colour layer behind transparent sections. It blends into the next section's colour
 *  across the last 55% of a screen's height of each section, following the scroll position. */
export default function ScrollBackground() {
  const ref = useRef<HTMLDivElement>(null);
  const { pathname } = useLocation();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let frame = 0;

    const update = () => {
      frame = 0;
      const sections = Array.from(document.querySelectorAll<HTMLElement>('main > section'));
      if (!sections.length) return;
      const y = window.scrollY;
      const zone = window.innerHeight * 0.55;
      let colour = colourOf(sections[0]);

      for (let i = 0; i < sections.length - 1; i++) {
        const top = sections[i].getBoundingClientRect().top + y;
        const bottom = top + sections[i].offsetHeight;
        const next = colourOf(sections[i + 1]);
        const start = Math.max(top, bottom - zone);
        if (y < start) break;
        if (y < bottom) {
          el.style.backgroundColor = mix(colour, next, (y - start) / (bottom - start || 1));
          return;
        }
        colour = next;
      }
      el.style.backgroundColor = colour;
    };

    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };

    const first = window.setTimeout(update, 0); // after the new page's sections mount
    const watcher = new ResizeObserver(schedule); // images or fonts shifting the layout
    watcher.observe(document.body);
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      window.clearTimeout(first);
      watcher.disconnect();
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      cancelAnimationFrame(frame);
    };
  }, [pathname]);

  return <div className="scroll-bg" ref={ref} aria-hidden="true" />;
}
