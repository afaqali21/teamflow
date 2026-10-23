"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { ArrowRight, Eye, EyeOff, KeyRound, Mail } from "lucide-react";
import { login } from "@/actions/auth";
import { Button } from "@/components/ui/button";

const fieldClassName =
  "h-11 w-full rounded-lg bg-surface-low pl-11 pr-4 text-sm text-foreground outline-none transition-all placeholder:text-outline/70 focus:bg-card focus-visible:ring-2 focus-visible:ring-primary/20";

export function LoginForm() {
  const [error, action, pending] = useActionState(login, null);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5 text-left">
        <label htmlFor="email" className="text-xs font-semibold tracking-wide text-foreground">
          Work Email
        </label>
        <div className="group relative flex items-center rounded-lg transition-all focus-within:ring-2 focus-within:ring-primary/20">
          <Mail
            aria-hidden
            className="pointer-events-none absolute left-3.5 size-5 text-outline transition-colors group-focus-within:text-primary"
          />
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="name@company.com"
            className={fieldClassName}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5 text-left">
        <div className="flex items-center justify-between">
          <label htmlFor="password" className="text-xs font-semibold tracking-wide text-foreground">
            Password
          </label>
          <Link
            href="/forgot-password"
            className="text-xs font-medium text-primary transition-colors hover:text-primary/80"
          >
            Forgot password?
          </Link>
        </div>
        <div className="group relative flex items-center rounded-lg transition-all focus-within:ring-2 focus-within:ring-primary/20">
          <KeyRound
            aria-hidden
            className="pointer-events-none absolute left-3.5 size-5 text-outline transition-colors group-focus-within:text-primary"
          />
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            placeholder="••••••••••••"
            className={`${fieldClassName} pr-11`}
          />
          <button
            type="button"
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-3 rounded-md p-1 text-outline transition-colors hover:text-foreground"
            onClick={() => setShowPassword((value) => !value)}
          >
            {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
          </button>
        </div>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <Button
        type="submit"
        disabled={pending}
        className="mt-2 h-12 w-full gap-2 rounded-xl bg-primary text-sm font-medium text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/90"
      >
        {pending ? "Signing in..." : "Sign in to Teamflow"}
        {!pending ? <ArrowRight className="size-5" /> : null}
      </Button>
    </form>
  );
}
