import Link from "next/link";

const links = [
  { href: "/admin", label: "Overview", exact: true },
  { href: "/admin/users", label: "Users", exact: false },
] as const;

export function AdminNav({ pathname }: { pathname: string }) {
  return (
    <nav className="flex flex-wrap gap-1 rounded-xl bg-muted p-1">
      {links.map((link) => {
        const active = link.exact ? pathname === link.href : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-lg px-3 py-2 text-sm transition-colors ${
              active
                ? "bg-card font-medium text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
