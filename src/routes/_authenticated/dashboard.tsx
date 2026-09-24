import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Users, UserCheck, CalendarOff, Building2, KeyRound, Hourglass, Wrench, PackageMinus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ErrorState, LoadingState, PageHeader } from "@/components/common/States";
import { useAuth } from "@/hooks/use-auth";
import { useT } from "@/lib/i18n";
import { P } from "@/lib/permissions";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "لوحة القيادة — BMS" }] }),
  component: Dashboard,
});

type Stats = Record<string, number>;

function Dashboard() {
  const t = useT();
  const { profile, can } = useAuth();
  const stats = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("dashboard_stats");
      if (error) throw error;
      return data as Stats;
    },
  });
  const recent = useQuery({
    queryKey: ["audit-recent"],
    enabled: can(P.auditRead),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("id, action, actor_email, entity_type, created_at")
        .order("created_at", { ascending: false })
        .limit(8);
      if (error) throw error;
      return data;
    },
  });

  const cards = [
    { key: "personnel_total", label: t.dashboard.personnelTotal, icon: Users, show: can(P.personnelRead) },
    { key: "personnel_active", label: t.dashboard.personnelActive, icon: UserCheck, show: can(P.personnelRead) },
    { key: "personnel_on_leave", label: t.dashboard.onLeave, icon: CalendarOff, show: can(P.personnelRead) },
    { key: "units_total", label: t.dashboard.units, icon: Building2, show: true },
    { key: "users_total", label: t.dashboard.users, icon: KeyRound, show: can(P.usersRead) },
    { key: "leave_pending", label: t.dashboard.leavePending, icon: Hourglass, show: can(P.leaveRead) },
    { key: "maintenance_open", label: t.dashboard.maintenanceOpen, icon: Wrench, show: can(P.maintenanceRead) },
    { key: "inventory_low", label: t.dashboard.inventoryLow, icon: PackageMinus, show: can(P.inventoryRead) },
  ].filter((c) => c.show);

  return (
    <div>
      <PageHeader
        title={t.dashboard.title}
        subtitle={`${t.auth.welcome}، ${profile?.full_name || profile?.email || ""} — ${t.dashboard.subtitle}`}
      />
      {stats.isLoading ? (
        <LoadingState rows={3} />
      ) : stats.error ? (
        <ErrorState error={stats.error} onRetry={() => stats.refetch()} />
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {cards.map((c) => (
            <div key={c.key} className="surface-panel stat-accent p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{c.label}</span>
                <c.icon className="size-4 text-muted-foreground" />
              </div>
              <div className="mt-2 text-3xl font-semibold tabular-nums">{stats.data?.[c.key] ?? 0}</div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="surface-panel p-5 lg:col-span-1">
          <h2 className="mb-3 text-sm font-semibold">{t.dashboard.quick}</h2>
          <div className="flex flex-col gap-2">
            {can(P.personnelRead) && (
              <Button asChild variant="outline" className="justify-start">
                <Link to="/personnel">{t.nav.personnel}</Link>
              </Button>
            )}
            {can(P.usersRead) && (
              <Button asChild variant="outline" className="justify-start">
                <Link to="/admin/users">{t.admin.users}</Link>
              </Button>
            )}
            {can(P.unitsRead) && (
              <Button asChild variant="outline" className="justify-start">
                <Link to="/admin/units">{t.admin.units}</Link>
              </Button>
            )}
            {can(P.auditRead) && (
              <Button asChild variant="outline" className="justify-start">
                <Link to="/admin/audit">{t.admin.audit}</Link>
              </Button>
            )}
          </div>
        </div>
        {can(P.auditRead) && (
          <div className="surface-panel p-5 lg:col-span-2">
            <h2 className="mb-3 text-sm font-semibold">{t.dashboard.recentAudit}</h2>
            {recent.isLoading ? (
              <p className="text-sm text-muted-foreground">{t.common.loading}</p>
            ) : recent.error ? (
              <p className="text-sm text-destructive">{t.common.error}</p>
            ) : !recent.data?.length ? (
              <p className="text-sm text-muted-foreground">{t.common.empty}</p>
            ) : (
              <ul className="divide-y">
                {recent.data.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <div className="min-w-0">
                      <code className="text-xs text-foreground" dir="ltr">{r.action}</code>
                      <div className="truncate text-xs text-muted-foreground" dir="ltr">{r.actor_email ?? t.audit.system}</div>
                    </div>
                    <time className="shrink-0 text-xs text-muted-foreground" dir="ltr">
                      {new Date(r.created_at).toLocaleString("en-GB")}
                    </time>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}