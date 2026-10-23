import Link from "next/link";
import { ChevronRight } from "lucide-react";

export type Crumb = {
  label: string;
  href?: string;
};

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-sm">
      {items.map((item, index) => {
        const last = index === items.length - 1;
        return (
          <span key={`${item.label}-${index}`} className="flex items-center gap-1.5">
            {index > 0 ? <ChevronRight className="size-3.5 shrink-0 text-outline" aria-hidden /> : null}
            {last || !item.href ? (
              <span
                aria-current={last ? "page" : undefined}
                className={
                  last
                    ? "rounded-md bg-[#e2dfff]/60 px-2 py-0.5 font-semibold text-primary"
                    : "text-muted-foreground"
                }
              >
                {item.label}
              </span>
            ) : (
              <Link href={item.href} className="text-muted-foreground transition-colors hover:text-foreground">
                {item.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
