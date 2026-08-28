import Link from "next/link";

/**
 * Shown in place of the sign-in and register forms when no database is
 * configured.
 *
 * The actions already refuse in that case, so nothing breaks without this —
 * but refusing on submit means someone types a name, an email and a password,
 * presses the button, and only then learns the feature does not exist here.
 * Saying so before they start is the difference between a limitation and a
 * waste of their time.
 *
 * It names the bag and wishlist explicitly, because those still work: the
 * point is that this browser keeps them rather than an account, not that
 * shopping is broken.
 */
export function AccountsUnavailable() {
  return (
    <div className="rounded-lg border border-ink-line bg-ink-soft px-4 py-5">
      <p className="text-sm text-bone">Accounts aren’t available yet.</p>
      <p className="mt-2 text-sm leading-relaxed text-bone/60">
        Your bag and saved items still work — this browser keeps them, so they
        stay put on this device but won’t follow you to another one.
      </p>
      <Link
        href="/collections/all"
        className="mt-4 inline-block text-label font-bold uppercase text-bone underline underline-offset-4 transition-opacity hover:opacity-70"
      >
        Keep shopping
      </Link>
    </div>
  );
}
