export default function EmptyState({
  variant = 'empty',
  icon,
  title = 'Nothing here yet',
  description,
  action,
}) {
  const isError = variant === 'error';

  const glyph =
    icon ||
    (isError ? (
      <svg
        className="empty-state-glyph"
        viewBox="0 0 48 48"
        role="img"
        aria-label="Error"
        focusable="false"
      >
        <circle
          cx="24"
          cy="24"
          r="20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          opacity="0.35"
        />
        <path
          d="M24 14v14"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle cx="24" cy="34" r="2.2" fill="currentColor" />
      </svg>
    ) : (
      <svg
        className="empty-state-glyph"
        viewBox="0 0 48 48"
        role="img"
        aria-label="No results"
        focusable="false"
      >
        <rect
          x="7"
          y="11"
          width="34"
          height="26"
          rx="4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          opacity="0.45"
        />
        <path
          d="M7 19h34"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          opacity="0.45"
        />
        <circle
          cx="22"
          cy="28"
          r="6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        />
        <path
          d="M26.5 32.5 32 38"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
    ));

  return (
    <div
      className={`empty-state${isError ? ' empty-state-error' : ''}`}
      role={isError ? 'alert' : 'status'}
    >
      <div className="empty-state-icon" aria-hidden={icon ? undefined : 'true'}>
        {glyph}
      </div>
      <h2 className="empty-state-title">{title}</h2>
      {description ? (
        <p className="empty-state-description user-text">{description}</p>
      ) : null}
      {action ? <div className="empty-state-action">{action}</div> : null}
    </div>
  );
}