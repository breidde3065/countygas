import { Children, cloneElement, isValidElement } from 'react';
import type { CSSProperties, ReactElement, ReactNode } from 'react';
import Backdrop from './Backdrop';
import { useSettings } from './settings';
import type { Branch } from './data';
import { status } from './lib';

export function Cylinder({ colour = 'yellow', small = false }: { colour?: string; small?: boolean }) {
  return (
    <div className={`cylinder cylinder-${colour} ${small ? 'cylinder-small' : ''}`} aria-hidden="true">
      <div className="cylinder-valve" />
      <div className="cylinder-neck" />
      <div className="cylinder-body">
        <span className="cylinder-brand">COUNTY</span>
        <span className="cylinder-gas">GAS</span>
        <span className="cylinder-star">✳</span>
      </div>
      <div className="cylinder-base" />
    </div>
  );
}

export function PageHead({ eyebrow, title, lead }: { eyebrow: string; title: ReactNode; lead?: string }) {
  return (
    <section className="page-head section-pad">
      <Backdrop variant="contact" />
      <Pop>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {lead && <p className="page-lead">{lead}</p>}
      </Pop>
    </section>
  );
}

export function OpenBadge({ branch }: { branch: Branch }) {
  const s = status(branch);
  return <span className={`status${s.open ? ' is-open' : ''}`}>{s.label}</span>;
}

export function BranchPicker({ value, onChange }: { value?: string; onChange: (id: string) => void }) {
  const { branches } = useSettings();
  return (
    <div className="pills" role="group" aria-label="Choose a branch">
      {branches.map((b) => (
        <button key={b.id} type="button" className="pill-btn" aria-pressed={value === b.id} onClick={() => onChange(b.id)}>
          {b.name}
        </button>
      ))}
    </div>
  );
}

/** Wraps every word in its own element so it can pop in. Keeps <br />, nested tags and classes intact. */
function popify(node: ReactNode, c: { n: number }): ReactNode {
  if (typeof node === 'string') {
    return node.split(/(\s+)/).map((w, i) =>
      w.trim() === '' ? w : <i key={i} className="pop-word" style={{ '--i': c.n++ } as CSSProperties}>{w}</i>,
    );
  }
  if (Array.isArray(node)) return Children.map(node, (n) => popify(n, c));
  if (isValidElement(node) && node.type !== 'br') {
    const el = node as ReactElement<{ children?: ReactNode }>;
    return cloneElement(el, undefined, popify(el.props.children, c));
  }
  return node;
}
export function Pop({ children }: { children: ReactNode }) {
  return <>{popify(children, { n: 0 })}</>;
}

export function Field({ id, label, error, hint, children }: { id: string; label: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children}
      {hint && !error && <p className="field-hint" id={`${id}-note`}>{hint}</p>}
      {error && <p className="field-error" id={`${id}-note`} role="alert">{error}</p>}
    </div>
  );
}
