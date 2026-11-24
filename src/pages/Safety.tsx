import { safety } from '../data';
import { useSettings } from '../settings';
import { useBranch, usePageTitle } from '../lib';
import { PageHead } from '../ui';

function Steps({ items }: { items: string[] }) {
  return (
    <ol className="steps">
      {items.map((t) => (<li key={t}><span>{t}</span></li>))}
    </ol>
  );
}

export default function Safety() {
  usePageTitle('Gas safety');
  const { business } = useSettings();
  const { branch } = useBranch();
  const phone = branch?.phone ?? business.phone;

  return (
    <>
      <PageHead eyebrow="SAFETY INFORMATION" title={<>GAS <em>SAFETY.</em></>} lead="A few minutes of care keeps your kitchen safe. Here is what we tell every customer." />

      <section className="page-body">
        <div className="panel panel-alert">
          <h2 className="panel-title">Smell gas? Do this now.</h2>
          <Steps items={safety.emergency} />
          <a className="button button-dark panel-action" href={`tel:${phone}`}>CALL YOUR BRANCH <span>↗</span></a>
        </div>

        <div className="two-col block-gap">
          <div>
            <p className="eyebrow">CHECK FOR LEAKS</p>
            <Steps items={safety.leak} />
          </div>
          <div>
            <p className="eyebrow">STORE IT SAFELY</p>
            <Steps items={safety.storage} />
          </div>
        </div>
      </section>
    </>
  );
}
