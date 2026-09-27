'use client';

import { useId } from 'react';

function FieldShell({
  id,
  label,
  hint,
  error,
  required,
  className = '',
  children,
}) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className={`field ${error ? 'field-invalid' : ''} ${className}`.trim()}>
      {label ? (
        <label className="field-label" htmlFor={id}>
          {label}
          {required ? (
            <span className="field-required" aria-hidden="true">
              *
            </span>
          ) : null}
        </label>
      ) : null}
      {children({ hintId, errorId })}
      {hint && !error ? (
        <p className="field-hint" id={hintId}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className="field-error" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function describedBy(hintId, errorId) {
  const ids = [hintId, errorId].filter(Boolean);
  return ids.length ? ids.join(' ') : undefined;
}

export default function Input({
  id,
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  error,
  hint,
  required = false,
  disabled = false,
  name,
  autoComplete,
  inputMode,
  min,
  max,
  step,
  className = '',
  ...rest
}) {
  const generatedId = useId();
  const fieldId = id || `input-${generatedId}`;

  return (
    <FieldShell
      id={fieldId}
      label={label}
      hint={hint}
      error={error}
      required={required}
      className={className}
    >
      {({ hintId, errorId }) => (
        <input
          className="field-control"
          id={fieldId}
          name={name || fieldId}
          type={type}
          value={value === undefined || value === null ? '' : value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          autoComplete={autoComplete}
          inputMode={inputMode}
          min={min}
          max={max}
          step={step}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy(hintId, errorId)}
          {...rest}
        />
      )}
    </FieldShell>
  );
}

export function Select({
  id,
  label,
  value,
  onChange,
  error,
  hint,
  required = false,
  disabled = false,
  name,
  children,
  className = '',
  ...rest
}) {
  const generatedId = useId();
  const fieldId = id || `select-${generatedId}`;

  return (
    <FieldShell
      id={fieldId}
      label={label}
      hint={hint}
      error={error}
      required={required}
      className={className}
    >
      {({ hintId, errorId }) => (
        <select
          className="field-control field-select"
          id={fieldId}
          name={name || fieldId}
          value={value === undefined || value === null ? '' : value}
          onChange={onChange}
          required={required}
          disabled={disabled}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy(hintId, errorId)}
          {...rest}
        >
          {children}
        </select>
      )}
    </FieldShell>
  );
}

export function Textarea({
  id,
  label,
  value,
  onChange,
  placeholder,
  error,
  hint,
  required = false,
  disabled = false,
  name,
  rows = 4,
  className = '',
  ...rest
}) {
  const generatedId = useId();
  const fieldId = id || `textarea-${generatedId}`;

  return (
    <FieldShell
      id={fieldId}
      label={label}
      hint={hint}
      error={error}
      required={required}
      className={className}
    >
      {({ hintId, errorId }) => (
        <textarea
          className="field-control field-textarea"
          id={fieldId}
          name={name || fieldId}
          rows={rows}
          value={value === undefined || value === null ? '' : value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy(hintId, errorId)}
          {...rest}
        />
      )}
    </FieldShell>
  );
}