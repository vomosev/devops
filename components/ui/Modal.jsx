'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

let modalCounter = 0;

export default function Modal({
  open = false,
  onClose,
  title,
  description,
  footer,
  children,
  labelledBy,
}) {
  const [mounted, setMounted] = useState(false);
  const dialogRef = useRef(null);
  const previouslyFocused = useRef(null);
  const idRef = useRef(null);

  if (idRef.current === null) {
    modalCounter += 1;
    idRef.current = `modal-${modalCounter}`;
  }

  const titleId = `${idRef.current}-title`;
  const descId = `${idRef.current}-desc`;

  useEffect(() => {
    setMounted(true);
  }, []);

  const requestClose = useCallback(() => {
    if (typeof onClose === 'function') onClose();
  }, [onClose]);

  const getFocusable = useCallback(() => {
    const node = dialogRef.current;
    if (!node) return [];
    return Array.from(node.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
      (el) => el.offsetParent !== null || el === document.activeElement
    );
  }, []);

  // Lock body scroll while open
  useEffect(() => {
    if (!open || typeof document === 'undefined') return undefined;
    const { body } = document;
    const previousOverflow = body.style.overflow;
    const previousPadding = body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`;
    }
    return () => {
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPadding;
    };
  }, [open]);

  // Focus management: move focus in on open, restore on close
  useEffect(() => {
    if (!open || typeof document === 'undefined') return undefined;
    previouslyFocused.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const frame = window.requestAnimationFrame(() => {
      const focusable = getFocusable();
      if (focusable.length > 0) {
        focusable[0].focus();
      } else if (dialogRef.current) {
        dialogRef.current.focus();
      }
    });

    return () => {
      window.cancelAnimationFrame(frame);
      const target = previouslyFocused.current;
      if (target && typeof target.focus === 'function' && document.contains(target)) {
        target.focus();
      }
    };
  }, [open, getFocusable]);

  // Escape + Tab trapping
  useEffect(() => {
    if (!open || typeof document === 'undefined') return undefined;

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        event.stopPropagation();
        requestClose();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusable = getFocusable();
      if (focusable.length === 0) {
        event.preventDefault();
        if (dialogRef.current) dialogRef.current.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey) {
        if (active === first || !dialogRef.current?.contains(active)) {
          event.preventDefault();
          last.focus();
        }
      } else if (active === last || !dialogRef.current?.contains(active)) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [open, requestClose, getFocusable]);

  if (!mounted || !open || typeof document === 'undefined') return null;

  const handleBackdropMouseDown = (event) => {
    if (event.target === event.currentTarget) {
      requestClose();
    }
  };

  return createPortal(
    <div
      className="modal-backdrop"
      onMouseDown={handleBackdropMouseDown}
      data-state="open"
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy || (title ? titleId : undefined)}
        aria-describedby={description ? descId : undefined}
        aria-label={!title && !labelledBy ? 'Dialog' : undefined}
        ref={dialogRef}
        tabIndex={-1}
      >
        <div className="modal-header">
          <div className="modal-heading-group">
            {title ? (
              <h2 id={titleId} className="modal-title">
                {title}
              </h2>
            ) : null}
            {description ? (
              <p id={descId} className="modal-description">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            className="modal-close"
            onClick={requestClose}
            aria-label="Close dialog"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              aria-hidden="true"
              focusable="false"
            >
              <path d="M5 5l10 10M15 5L5 15" />
            </svg>
          </button>
        </div>

        <div className="modal-body">{children}</div>

        {footer ? <div className="modal-footer">{footer}</div> : null}
      </div>
    </div>,
    document.body
  );
}