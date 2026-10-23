"use client";

import { useActionState, useState } from "react";
import { createProject, type ProjectFormState } from "@/actions/projects";
import { Button } from "@/components/ui/button";

const initialState: ProjectFormState = { error: null };

const fieldClassName =
  "flex w-full rounded-xl border border-transparent bg-surface-low px-3.5 text-sm outline-none transition-shadow placeholder:text-outline focus-visible:border-primary/30 focus-visible:bg-card focus-visible:ring-2 focus-visible:ring-primary/20";

export function CreateProjectForm({
  people,
}: {
  people: { id: string; label: string }[];
}) {
  const [state, action, pending] = useActionState(createProject, initialState);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());

  function togglePerson(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <form action={action} className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Project name
          <input
            name="name"
            required
            maxLength={80}
            placeholder="e.g. Website redesign"
            className={`${fieldClassName} h-11`}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Description
          <textarea
            name="description"
            maxLength={2000}
            rows={5}
            placeholder="What is this project for?"
            className={`${fieldClassName} resize-y py-2.5`}
          />
        </label>
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <Button type="submit" disabled={pending} className="h-10 px-4">
            {pending ? "Creating..." : "Create project"}
          </Button>
          {state.error ? (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl bg-surface-low/80 p-4 md:p-5">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm font-semibold">Add people</p>
          <p className="text-xs text-muted-foreground">
            {selected.size > 0 ? `${selected.size} selected` : "Optional"}
          </p>
        </div>
        {people.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No other active users to invite yet. You will be added as owner.
          </p>
        ) : (
          <ul className="grid max-h-64 gap-2 overflow-y-auto sm:grid-cols-1">
            {people.map((person) => {
              const checked = selected.has(person.id);
              const initial = person.label.trim().charAt(0).toUpperCase() || "?";
              return (
                <li key={person.id}>
                  <label
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors ${
                      checked
                        ? "border-primary/40 bg-card shadow-sm"
                        : "border-transparent bg-card/70 hover:border-border"
                    }`}
                  >
                    <input
                      type="checkbox"
                      name="memberId"
                      value={person.id}
                      checked={checked}
                      onChange={() => togglePerson(person.id)}
                      className="sr-only"
                    />
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#e2dfff] text-xs font-semibold text-primary">
                      {initial}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{person.label}</span>
                    <span
                      className={`flex size-5 items-center justify-center rounded-md border text-[10px] font-bold ${
                        checked
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card text-transparent"
                      }`}
                      aria-hidden
                    >
                      ✓
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </form>
  );
}
