'use client';

import React from 'react';
import EmptyState from './EmptyState';

function cellValue(column, row, rowIndex) {
  if (typeof column.render === 'function') {
    return column.render(row, rowIndex);
  }
  const value = row ? row[column.key] : undefined;
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch (err) {
      return '—';
    }
  }
  return value;
}

function alignClass(align) {
  if (align === 'right') return 'table-cell-right';
  if (align === 'center') return 'table-cell-center';
  return 'table-cell-left';
}

export default function Table({
  columns = [],
  rows = [],
  emptyMessage = 'Nothing to show here yet.',
  emptyTitle = 'No records',
  loading = false,
  caption,
  skeletonRows = 4,
  className = '',
}) {
  const safeColumns = Array.isArray(columns) ? columns.filter(Boolean) : [];
  const safeRows = Array.isArray(rows) ? rows : [];

  if (safeColumns.length === 0) {
    return (
      <div className="table-wrap">
        <EmptyState
          variant="empty"
          title="Table not configured"
          description="No columns were provided for this table."
        />
      </div>
    );
  }

  if (!loading && safeRows.length === 0) {
    return (
      <div className={`table-wrap table-wrap-empty ${className}`.trim()}>
        <EmptyState variant="empty" title={emptyTitle} description={emptyMessage} />
      </div>
    );
  }

  return (
    <div className={`table-wrap ${className}`.trim()} role="region" aria-label={caption || 'Data table'} tabIndex={0}>
      <table className="table">
        {caption ? <caption className="table-caption">{caption}</caption> : null}
        <thead className="table-head">
          <tr>
            {safeColumns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={`table-th ${alignClass(column.align)}`}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="table-body">
          {loading
            ? Array.from({ length: Math.max(1, skeletonRows) }).map((_, rowIndex) => (
                <tr key={`skeleton-${rowIndex}`} className="table-row table-row-skeleton" aria-hidden="true">
                  {safeColumns.map((column) => (
                    <td key={column.key} className={`table-td ${alignClass(column.align)}`}>
                      <span className="skeleton skeleton-text" />
                    </td>
                  ))}
                </tr>
              ))
            : safeRows.map((row, rowIndex) => (
                <tr key={row && (row.id ?? row.key) ? `${row.id ?? row.key}` : `row-${rowIndex}`} className="table-row">
                  {safeColumns.map((column) => (
                    <td key={column.key} className={`table-td ${alignClass(column.align)}`}>
                      <span className="table-cell-inner user-text">{cellValue(column, row, rowIndex)}</span>
                    </td>
                  ))}
                </tr>
              ))}
        </tbody>
      </table>
      {loading ? <span className="sr-only">Loading table data…</span> : null}
    </div>
  );
}