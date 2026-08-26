import { LoginForm } from "./LoginForm";

/**
 * Sits outside the `(dashboard)` group, so it renders without the sidebar and
 * is excluded from the session check in `middleware.ts`.
 */
export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-[380px]">
        {/* Branding block — dark ink panel, matching the sidebar */}
        <div className="rounded-t-xl bg-ink px-8 py-7 text-center">
          <span
            className="inline-block whitespace-nowrap font-display text-lg font-black uppercase leading-none text-bone"
            style={{ letterSpacing: "0.3em", paddingLeft: "0.3em" }}
          >
            VANTA
          </span>
          <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-bone/40">
            Content Manager
          </p>
        </div>

        <div className="rounded-b-xl border border-t-0 border-admin-border bg-admin-surface px-8 py-7">
          <h1 className="font-admin-display text-xl font-bold tracking-tight text-admin-ink">
            Sign in
          </h1>
          <p className="mb-6 mt-1 text-sm text-admin-muted">
            Enter your details to manage the site&rsquo;s content.
          </p>

          <LoginForm />
        </div>

        <p className="mt-6 text-center text-xs text-admin-subtle">
          Trouble signing in? Contact your site administrator.
        </p>
      </div>
    </div>
  );
}
