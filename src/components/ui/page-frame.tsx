import { Breadcrumbs, type Crumb } from "@/components/shell/breadcrumbs";

export function PageFrame({
  children,
  wide,
  crumbs,
}: {
  children: React.ReactNode;
  wide?: boolean;
  crumbs?: Crumb[];
}) {
  return (
    <main
      className={`mx-auto flex w-full flex-col gap-8 px-6 py-8 md:px-8 ${
        wide ? "max-w-6xl" : "max-w-5xl"
      }`}
    >
      {crumbs && crumbs.length > 0 ? <Breadcrumbs items={crumbs} /> : null}
      {children}
    </main>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        {eyebrow ? (
          <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
        {description ? (
          <div className="mt-1.5 text-sm text-muted-foreground">{description}</div>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function SurfaceCard({
  children,
  className = "",
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <div id={id} className={`rounded-2xl bg-card p-5 shadow-sm md:p-6 ${className}`}>
      {children}
    </div>
  );
}
