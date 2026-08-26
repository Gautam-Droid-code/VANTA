import { AdminDraftProvider } from "@/components/admin/AdminDraftProvider";
import { AdminShell } from "@/components/admin/AdminShell";

/**
 * Dashboard chrome. Everything under this group is behind the session check in
 * `middleware.ts`; `/admin/login` sits outside the group so it renders without
 * the sidebar and without requiring a session.
 */
export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminDraftProvider>
      <AdminShell>{children}</AdminShell>
    </AdminDraftProvider>
  );
}
