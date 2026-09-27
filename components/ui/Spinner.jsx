export default function Spinner({ size = 'md', label = 'Loading' }) {
  const sizeClass =
    size === 'sm' ? 'spinner-sm' : size === 'lg' ? 'spinner-lg' : 'spinner-md';

  return (
    <span className={`spinner ${sizeClass}`} role="status" aria-live="polite">
      <svg
        className="spinner-ring"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        focusable="false"
      >
        <circle
          className="spinner-track"
          cx="12"
          cy="12"
          r="9"
          stroke="currentColor"
          strokeWidth="3"
          opacity="0.25"
        />
        <path
          className="spinner-head"
          d="M21 12a9 9 0 0 0-9-9"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
      <span className="visually-hidden">{label}</span>
    </span>
  );
}