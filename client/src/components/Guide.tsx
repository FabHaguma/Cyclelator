import { useEffect, useRef } from 'react';
import Icon from './Icon';
import styles from './Guide.module.css';

export default function Guide({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current!;
    d.showModal();
    return () => d.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      onCancel={onClose}
      aria-labelledby="guide-title"
    >
      <header>
        <span className={styles.symbol}>
          <Icon name="flower" size={28} />
        </span>
        <button aria-label="Close cycle guide" onClick={onClose}>
          <Icon name="close" />
        </button>
      </header>
      <h2 id="guide-title">A little cycle clarity.</h2>
      <p>Understand the estimates in your calendar.</p>
      <section>
        <h3>It begins with day one</h3>
        <p>
          Log the first day of a period to anchor the calendar. Coral marks
          recorded or estimated period starts.
        </p>
      </section>
      <section>
        <h3>An estimate that learns</h3>
        <p>
          Cyclelator starts with a 28-day model. After four recorded starts, it
          averages the three latest completed cycles. A fixed cycle length in a
          profile takes priority.
        </p>
      </section>
      <section>
        <h3>The lavender days</h3>
        <p>
          The model estimates ovulation on cycle day “length minus 14”. The
          fertile window includes that day and the five preceding days. Actual
          timing can vary.
        </p>
      </section>
      <section>
        <h3>Use estimates with care</h3>
        <p>
          Period dates alone cannot reliably determine fertility. Use an
          appropriate contraceptive method to prevent pregnancy.{' '}
          <a
            href="https://www.nhs.uk/contraception/methods-of-contraception/natural-family-planning/"
            target="_blank"
            rel="noreferrer"
          >
            Read the NHS guidance ↗
          </a>
        </p>
      </section>
      <button className="btn-primary" onClick={onClose}>
        Got it <Icon name="check" size={16} />
      </button>
    </dialog>
  );
}
