/**
 * Horizon skeletons — placeholders shaped like the real content,
 * so pages don't jump when data lands. Figma: "Skeleton" frames.
 */
import Icon from '../Icon/Icon';
import './Skeleton.css';

export function Skeleton({ w = '100%', h = 14, r = 6, className = '', style }) {
  return <span className={`sw-skel ${className}`} style={{ width: w, height: h, borderRadius: r, ...style }} aria-hidden="true" />;
}

function Busy({ label, children, className = '' }) {
  return (
    <div className={className} role="status" aria-live="polite" aria-busy="true">
      <span className="sw-visually-hidden">{label}</span>
      {children}
    </div>
  );
}

export function FlightCardSkeleton() {
  return (
    <div className="skel-card skel-flight">
      <div className="skel-row">
        <Skeleton w={40} h={40} r={10} />
        <div className="skel-stack" style={{ width: 120 }}>
          <Skeleton w="80%" h={14} />
          <Skeleton w="50%" h={11} />
        </div>
      </div>
      <div className="skel-row skel-flight__times">
        <div className="skel-stack"><Skeleton w={64} h={24} /><Skeleton w={36} h={11} /></div>
        <div className="skel-stack skel-grow" style={{ alignItems: 'center' }}><Skeleton w={60} h={11} /><Skeleton w="100%" h={2} /><Skeleton w={52} h={11} /></div>
        <div className="skel-stack" style={{ alignItems: 'flex-end' }}><Skeleton w={64} h={24} /><Skeleton w={36} h={11} /></div>
      </div>
      <div className="skel-stack skel-flight__price">
        <Skeleton w={96} h={26} />
        <Skeleton w={120} h={40} r={999} />
      </div>
    </div>
  );
}

export function FlightListSkeleton({ count = 5 }) {
  return (
    <Busy label="Searching live fares…" className="skel-list">
      <SearchingNote text="Checking live fares with our suppliers…" />
      {Array.from({ length: count }, (_, i) => <FlightCardSkeleton key={i} />)}
    </Busy>
  );
}

export function HotelCardSkeleton() {
  return (
    <div className="skel-card skel-hotel">
      <Skeleton className="skel-hotel__photo" h="100%" r={0} />
      <div className="skel-stack skel-hotel__body">
        <Skeleton w={84} h={12} />
        <Skeleton w="70%" h={20} />
        <Skeleton w="45%" h={12} />
        <Skeleton w="60%" h={12} />
        <div className="skel-row" style={{ marginTop: 8 }}><Skeleton w={110} h={22} r={6} /><Skeleton w={90} h={22} r={6} /></div>
      </div>
      <div className="skel-stack skel-hotel__price">
        <Skeleton w={110} h={28} r={8} />
        <Skeleton w={96} h={26} />
        <Skeleton w={80} h={11} />
        <Skeleton w={120} h={40} r={999} />
      </div>
    </div>
  );
}

export function HotelListSkeleton({ count = 4 }) {
  return (
    <Busy label="Finding stays…" className="skel-list">
      <SearchingNote text="Fetching live room rates…" />
      {Array.from({ length: count }, (_, i) => <HotelCardSkeleton key={i} />)}
    </Busy>
  );
}

export function HotelDetailsSkeleton() {
  return (
    <Busy label="Loading hotel…" className="skel-details">
      <div className="skel-stack"><Skeleton w={160} h={12} /><Skeleton w="55%" h={36} /><Skeleton w="35%" h={14} /></div>
      <div className="skel-gallery">
        <Skeleton h="100%" r={0} />
        <div className="skel-gallery__grid">{[0, 1, 2, 3].map(i => <Skeleton key={i} h="100%" r={0} />)}</div>
      </div>
      <div className="skel-details__cols">
        <div className="skel-stack" style={{ gap: 12 }}>
          <Skeleton w="40%" h={24} /><Skeleton h={14} /><Skeleton h={14} /><Skeleton w="80%" h={14} />
          {[0, 1].map(i => <div key={i} className="skel-card" style={{ height: 160, marginTop: 12 }} />)}
        </div>
        <div className="skel-card skel-stack" style={{ gap: 14 }}>
          <Skeleton w="50%" h={28} /><Skeleton h={56} r={12} /><Skeleton h={120} r={12} /><Skeleton h={52} r={999} />
        </div>
      </div>
    </Busy>
  );
}

export function BookingListSkeleton({ count = 3 }) {
  return (
    <Busy label="Loading your trips…" className="skel-list">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="skel-card skel-trip">
          <Skeleton className="skel-trip__art" h="100%" r={0} />
          <div className="skel-stack skel-grow" style={{ padding: 20 }}>
            <div className="skel-row"><Skeleton w={80} h={22} /><Skeleton w={90} h={22} r={999} /></div>
            <Skeleton w="50%" h={18} /><Skeleton w="65%" h={12} /><Skeleton w="40%" h={12} />
          </div>
          <div className="skel-stack" style={{ padding: 20, alignItems: 'flex-end' }}><Skeleton w={90} h={24} /><Skeleton w={110} h={36} r={999} /></div>
        </div>
      ))}
    </Busy>
  );
}

/** Generic page skeleton: title + two-column form/summary */
export function PageSkeleton({ label = 'Loading…' }) {
  return (
    <Busy label={label} className="skel-page container">
      <div className="skel-stack"><Skeleton w={120} h={12} /><Skeleton w="40%" h={34} /><Skeleton w="30%" h={14} /></div>
      <div className="skel-details__cols">
        <div className="skel-stack" style={{ gap: 16 }}>
          {[0, 1, 2].map(i => (
            <div key={i} className="skel-card skel-stack" style={{ gap: 14 }}>
              <Skeleton w="30%" h={18} />
              <div className="skel-row"><Skeleton h={48} r={8} /><Skeleton h={48} r={8} /></div>
            </div>
          ))}
        </div>
        <div className="skel-card skel-stack" style={{ gap: 14 }}>
          <Skeleton h={140} r={12} /><Skeleton w="60%" h={18} /><Skeleton h={12} /><Skeleton h={12} /><Skeleton h={48} r={999} />
        </div>
      </div>
    </Busy>
  );
}

function SearchingNote({ text }) {
  return (
    <div className="skel-note">
      <span className="skel-note__bar"><span /></span>
      <span>{text}</span>
    </div>
  );
}

/** Empty / error / info state — one look everywhere */
export function StateMessage({ icon = 'info', tone = 'neutral', title, children, action }) {
  return (
    <div className={`sw-state sw-state--${tone}`} role={tone === 'danger' ? 'alert' : undefined}>
      <span className="sw-state__icon"><Icon name={icon} size={26} /></span>
      <h3 className="sw-state__title">{title}</h3>
      {children && <p className="sw-state__text">{children}</p>}
      {action && <div className="sw-state__action">{action}</div>}
    </div>
  );
}
