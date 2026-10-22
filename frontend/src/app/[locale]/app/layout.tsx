import { AuthGuard } from "@/components/dashboard/auth-guard";
import { DashboardShell } from "@/components/dashboard/shell";
import { TelemetryProvider } from "@/lib/hooks";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      {/* Inside the guard so the socket only opens for a signed-in user. */}
      <TelemetryProvider>
        <DashboardShell>{children}</DashboardShell>
      </TelemetryProvider>
    </AuthGuard>
  );
}
