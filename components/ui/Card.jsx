export function CardHeader({ className = '', children, ...rest }) {
  return (
    <div className={`card-header ${className}`.trim()} {...rest}>
      {children}
    </div>
  );
}

export function CardBody({ className = '', children, ...rest }) {
  return (
    <div className={`card-body ${className}`.trim()} {...rest}>
      {children}
    </div>
  );
}

export function CardFooter({ className = '', children, ...rest }) {
  return (
    <div className={`card-footer ${className}`.trim()} {...rest}>
      {children}
    </div>
  );
}

export default function Card({
  as: Component = 'div',
  interactive = false,
  padding = 'md',
  className = '',
  children,
  ...rest
}) {
  const paddingClass = ['sm', 'md', 'lg'].includes(padding)
    ? `card-pad-${padding}`
    : 'card-pad-md';

  const classes = [
    'card',
    paddingClass,
    interactive ? 'card-interactive' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Component className={classes} {...rest}>
      {children}
    </Component>
  );
}