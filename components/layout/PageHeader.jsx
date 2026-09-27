import Badge from '../ui/Badge';

export default function PageHeader({ eyebrow, title, description, actions }) {
  if (!title && !eyebrow && !description && !actions) return null;

  return (
    <header className="page-header">
      <div className="page-header-main">
        {eyebrow ? (
          <div className="page-header-eyebrow">
            <Badge tone="accent" size="sm">
              {eyebrow}
            </Badge>
          </div>
        ) : null}
        {title ? <h1 className="page-header-title">{title}</h1> : null}
        {description ? (
          <p className="page-header-description">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="page-header-actions cluster">{actions}</div> : null}
    </header>
  );
}