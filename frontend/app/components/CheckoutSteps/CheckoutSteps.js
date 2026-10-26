import Icon from '../Icon/Icon';
import './CheckoutSteps.css';

/**
 * Booking progress — Figma "Checkout header" progress.
 * <CheckoutSteps steps={['Room', 'Guest details', 'Payment', 'Confirmed']} current={1} />
 */
export default function CheckoutSteps({ steps, current }) {
  return (
    <ol className="checkout-steps" aria-label="Booking progress">
      {steps.map((label, i) => {
        const state = i < current ? 'done' : i === current ? 'current' : 'todo';
        return (
          <li key={label} className={`checkout-step is-${state}`} aria-current={state === 'current' ? 'step' : undefined}>
            <span className="checkout-step__dot">{state === 'done' ? <Icon name="check" size={14} strokeWidth={3} /> : i + 1}</span>
            <span className="checkout-step__label">{label}</span>
          </li>
        );
      })}
    </ol>
  );
}

/** Numbered form section card used on checkout pages */
export function CheckoutSection({ number, title, subtitle, children, aside }) {
  return (
    <section className="co-section">
      <header className="co-section__head">
        {number != null && <span className="co-section__no">{number}</span>}
        <div className="co-section__titles">
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {aside}
      </header>
      {children}
    </section>
  );
}
