import type { Metadata } from "next";
import { adminDisplay } from "./fonts";

export const metadata: Metadata = {
  title: "VANTA Content Manager",
  description: "Edit VANTA homepage content.",
  robots: { index: false, follow: false },
};

/**
 * Applies to every `/admin` route including the login page, so it carries only
 * the admin font and page background — no sidebar, no draft state. The
 * dashboard chrome lives in `(dashboard)/layout.tsx`, which the login page
 * deliberately sits outside of.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${adminDisplay.variable} min-h-screen bg-admin-bg text-admin-ink`}>
      {children}
    </div>
  );
}
