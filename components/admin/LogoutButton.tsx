"use client";

import { useFormStatus } from "react-dom";
import { logoutAction } from "@/app/admin/login/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-admin-muted transition-colors hover:bg-admin-bg hover:text-admin-ink disabled:opacity-50"
    >
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}

/** Posts to the logout server action, which clears the cookie and redirects. */
export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <SubmitButton />
    </form>
  );
}
