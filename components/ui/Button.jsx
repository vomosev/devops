'use client';

import React from 'react';
import Link from 'next/link';
import Spinner from './Spinner';

const VARIANTS = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
  danger: 'btn-danger',
};

const SIZES = {
  sm: 'btn-sm',
  md: 'btn-md',
  lg: 'btn-lg',
};

/**
 * Shared Button primitive.
 * Renders a <button>, a next/link <Link>, or a plain <a> depending on props.
 */
const Button = React.forwardRef(function Button(
  {
    as,
    href,
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    fullWidth = false,
    type = 'button',
    onClick,
    className = '',
    children,
    ...rest
  },
  ref
) {
  const variantClass = VARIANTS[variant] || VARIANTS.primary;
  const sizeClass = SIZES[size] || SIZES.md;

  const classes = [
    'btn',
    variantClass,
    sizeClass,
    fullWidth ? 'btn-block' : '',
    loading ? 'is-loading' : '',
    disabled ? 'is-disabled' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const spinnerSize = size === 'lg' ? 'md' : 'sm';

  const content = (
    <>
      {loading ? <Spinner size={spinnerSize} label="Working" /> : null}
      <span className="btn-label">{children}</span>
    </>
  );

  const isLink = as === 'a' || as === Link || (!as && typeof href === 'string' && href.length > 0);

  if (isLink) {
    const inert = disabled || loading;

    const handleLinkClick = (event) => {
      if (inert) {
        event.preventDefault();
        return;
      }
      if (typeof onClick === 'function') onClick(event);
    };

    const linkProps = {
      className: classes,
      'aria-busy': loading ? 'true' : undefined,
      'aria-disabled': inert ? 'true' : undefined,
      tabIndex: inert ? -1 : undefined,
      onClick: handleLinkClick,
      ref,
      ...rest,
    };

    const safeHref = typeof href === 'string' && href.length > 0 ? href : '#';
    const isInternal = safeHref.startsWith('/') && as !== 'a';

    if (isInternal) {
      return (
        <Link href={safeHref} {...linkProps}>
          {content}
        </Link>
      );
    }

    return (
      <a href={safeHref} {...linkProps}>
        {content}
      </a>
    );
  }

  const handleClick = (event) => {
    if (disabled || loading) {
      event.preventDefault();
      return;
    }
    if (typeof onClick === 'function') onClick(event);
  };

  return (
    <button
      ref={ref}
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading ? 'true' : undefined}
      onClick={handleClick}
      {...rest}
    >
      {content}
    </button>
  );
});

export default Button;