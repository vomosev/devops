import Card from './ui/Card';
import Badge from './ui/Badge';

export default function StatCard({ label, value, unit, trend, icon }) {
  const displayValue = value === null || value === undefined || value === '' ? '—' : value;

  return (
    <Card className="stat-card" padding="md">
      <div className="stat-card-top">
        <span className="stat-card-label">{label}</span>
        <span className="stat-card-icon" aria-hidden="true">
          {icon || (
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19V10" />
              <path d="M10 19V5" />
              <path d="M16 19v-6" />
              <path d="M22 19H2" />
            </svg>
          )}
        </span>
      </div>

      <p className="stat-card-value">
        <span className="stat-card-number">{displayValue}</span>
        {unit ? <span className="stat-card-unit">{unit}</span> : null}
      </p>

      {trend ? (
        <div className="stat-card-trend">
          <Badge tone={trend.tone || 'neutral'} size="sm">
            {trend.label}
          </Badge>
        </div>
      ) : (
        <div className="stat-card-trend stat-card-trend-empty" aria-hidden="true" />
      )}
    </Card>
  );
}