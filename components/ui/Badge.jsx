export default function Badge({
  tone = 'neutral',
  size = 'sm',
  className = '',
  children,
  ...rest
}) {
  const tones = ['neutral', 'accent', 'success', 'warning', 'danger'];
  const sizes = ['sm', 'md'];

  const safeTone = tones.includes(tone) ? tone : 'neutral';
  const safeSize = sizes.includes(size) ? size : 'sm';

  if (children === null || children === undefined || children === false) {
    return null;
  }

  const classes = ['badge', `badge-${safeTone}`, `badge-${safeSize}`, className]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={classes} {...rest}>
      {children}
    </span>
  );
}

export { Badge };