import { percent } from '../../lib/formatters';

export default function ProgressBar({
  value = 0,
  max = 100,
  label,
  showValue = true,
  size = 'md',
}) {
  const safeMax = Number(max) > 0 ? Number(max) : 100;
  const safeValue = Number.isFinite(Number(value)) ? Number(value) : 0;
  const clamped = Math.min(Math.max(safeValue, 0), safeMax);
  const pct = percent(clamped, safeMax);
  const tone = pct >= 100 ? 'progress-complete' : 'progress-active';
  const sizeClass = `progress-${['sm', 'md', 'lg'].includes(size) ? size : 'md'}`;

  return (
    <div className="progress">
      {(label || showValue) && (
        <div className="progress-meta">
          {label ? <span className="progress-label">{label}</span> : <span />}
          {showValue ? <span className="progress-value">{pct}%</span> : null}
        </div>
      )}
      <div
        className={`progress-track ${sizeClass}`}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label || 'Progress'}
      >
        <div className={`progress-fill ${tone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}