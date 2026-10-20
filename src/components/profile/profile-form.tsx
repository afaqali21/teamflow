"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { confirmAvatarUpload, requestAvatarUpload, updateProfileName, type ProfileState } from "@/actions/profile";
import { Button } from "@/components/ui/button";
import { validateAvatarUpload } from "@/lib/avatar";

const initialState: ProfileState = { error: null, saved: false };

const fieldClassName =
  "flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function ProfileForm({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(updateProfileName, initialState);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function onFile(file: File | undefined) {
    if (!file) {
      return;
    }

    const localError = validateAvatarUpload({ size: file.size, mimeType: file.type });
    if (localError) {
      setAvatarError(localError);
      return;
    }

    setUploading(true);
    setAvatarError(null);
    const ticket = await requestAvatarUpload({ size: file.size, mimeType: file.type });
    if (ticket.error || !ticket.uploadUrl || !ticket.key) {
      setAvatarError(ticket.error ?? "The upload could not start.");
      setUploading(false);
      return;
    }

    const uploaded = await fetch(ticket.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    });
    if (!uploaded.ok) {
      setAvatarError("The upload failed. Try again.");
      setUploading(false);
      return;
    }

    const confirmed = await confirmAvatarUpload(ticket.key);
    setUploading(false);
    if (confirmed.error) {
      setAvatarError(confirmed.error);
      return;
    }

    router.refresh();
  }

  return (
    <div className="space-y-8">
      <form action={action} className="max-w-md space-y-3">
        <label className="block space-y-2 text-sm font-medium" htmlFor="name">
          Name
          <input
            id="name"
            name="name"
            required
            maxLength={80}
            defaultValue={name}
            className={fieldClassName}
          />
        </label>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : "Save name"}
        </Button>
        {state.error ? (
          <p role="alert" className="text-sm text-destructive">
            {state.error}
          </p>
        ) : null}
        {state.saved ? <p className="text-sm text-muted-foreground">Name saved.</p> : null}
      </form>

      <form className="max-w-md space-y-3">
        <div className="flex items-center gap-3">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" className="size-16 rounded-full object-cover" />
          ) : (
            <span className="flex size-16 items-center justify-center rounded-full bg-muted text-lg font-medium">
              {(name.slice(0, 1) || "?").toUpperCase()}
            </span>
          )}
          <label className="text-sm font-medium" htmlFor="avatar">
            Avatar
            <input
              id="avatar"
              name="avatar"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="mt-2 block w-full text-sm"
              disabled={uploading}
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                void onFile(file);
              }}
            />
          </label>
        </div>
        <p className="text-sm text-muted-foreground">JPEG, PNG, WebP, or GIF. 2 MB maximum.</p>
        {uploading ? <p className="text-sm text-muted-foreground">Uploading...</p> : null}
        {avatarError ? (
          <p role="alert" className="text-sm text-destructive">
            {avatarError}
          </p>
        ) : null}
      </form>
    </div>
  );
}
