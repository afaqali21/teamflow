"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

export function GlobalSearchField({ defaultQuery = "" }: { defaultQuery?: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
          return;
        }
        router.push("/search");
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router]);

  return (
    <form action="/search" className="relative hidden max-w-md flex-1 md:block">
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        ref={inputRef}
        name="q"
        type="search"
        minLength={2}
        defaultValue={defaultQuery}
        placeholder="Search tasks, projects, people..."
        className="h-10 w-full rounded-lg bg-card pr-12 pl-10 text-sm text-foreground outline-none placeholder:text-outline focus-visible:ring-2 focus-visible:ring-primary/20"
        aria-label="Search"
      />
      <kbd className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 rounded bg-surface-high px-1.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
        ⌘K
      </kbd>
    </form>
  );
}
