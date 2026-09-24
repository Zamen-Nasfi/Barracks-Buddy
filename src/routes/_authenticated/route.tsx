import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/hooks/use-auth";
import { ErrorState, LoadingState } from "@/components/common/States";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { profile, isLoading, error, refetch } = useAuth();
  const t = useT();

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl p-8">
        <LoadingState rows={4} />
      </div>
    );
  }
  if (error) {
    return (
      <div className="mx-auto max-w-3xl p-8">
        <ErrorState error={error} onRetry={() => refetch()} />
      </div>
    );
  }
  if (profile && (profile.roles.length === 0 || !profile.is_active)) {
    return (
      <AppShell>
        <div className="surface-panel mx-auto max-w-lg px-6 py-12 text-center">
          <h2 className="text-lg font-semibold">{t.auth.pendingTitle}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{t.auth.pendingBody}</p>
        </div>
      </AppShell>
    );
  }
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}