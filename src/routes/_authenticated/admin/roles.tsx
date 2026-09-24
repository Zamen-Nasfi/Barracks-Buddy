import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { ErrorState, LoadingState, PageHeader } from "@/components/common/States";
import { RequirePermission } from "@/components/layout/AppShell";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/use-auth";
import { localizedName, useLocale, useT } from "@/lib/i18n";
import { P } from "@/lib/permissions";

export const Route = createFileRoute("/_authenticated/admin/roles")({
  head: () => ({ meta: [{ title: "الأدوار والصلاحيات — BMS" }] }),
  component: () => (
    <RequirePermission anyOf={[P.rolesRead]}>
      <RolesPage />
    </RequirePermission>
  ),
});

function RolesPage() {
  const t = useT();
  const { locale } = useLocale();
  const { can, refetch: refetchAuth } = useAuth();
  const qc = useQueryClient();

  const data = useQuery({
    queryKey: ["roles-matrix"],
    queryFn: async () => {
      const [r, p, rp] = await Promise.all([
        supabase.from("roles").select("id, code, name_ar, name_en, name_fr").order("code"),
        supabase.from("permissions").select("id, code, module, name_ar, name_en, name_fr").order("module").order("code"),
        supabase.from("role_permissions").select("role_id, permission_id"),
      ]);
      if (r.error) throw r.error; if (p.error) throw p.error; if (rp.error) throw rp.error;
      return { roles: r.data, permissions: p.data, granted: new Set(rp.data.map((x) => `${x.role_id}:${x.permission_id}`)) };
    },
  });

  const toggle = useMutation({
    mutationFn: async ({ roleId, permId, grant }: { roleId: string; permId: string; grant: boolean }) => {
      const { error } = grant
        ? await supabase.from("role_permissions").insert({ role_id: roleId, permission_id: permId })
        : await supabase.from("role_permissions").delete().eq("role_id", roleId).eq("permission_id", permId);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["roles-matrix"] }); refetchAuth(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const editable = can(P.rolesManage);

  return (
    <div>
      <PageHeader title={t.roles.title} subtitle={t.roles.subtitle} />
      <AdminTabs />
      {data.isLoading ? <LoadingState /> : data.error ? <ErrorState error={data.error} onRetry={() => data.refetch()} /> : (
        <div className="surface-panel overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/60">
              <tr>
                <th className="sticky start-0 bg-muted/60 px-3 py-2 text-start font-medium">{t.roles.permission}</th>
                {data.data!.roles.map((r) => (
                  <th key={r.id} className="px-2 py-2 text-center text-xs font-medium">
                    <div>{localizedName(r, locale)}</div>
                    <code className="text-[10px] text-muted-foreground" dir="ltr">{r.code}</code>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.data!.permissions.map((perm, i, arr) => {
                const newModule = i === 0 || arr[i - 1]!.module !== perm.module;
                return (
                  <>
                    {newModule && (
                      <tr key={`m-${perm.module}`} className="bg-secondary/60">
                        <td colSpan={data.data!.roles.length + 1} className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground" dir="ltr">
                          {perm.module}
                        </td>
                      </tr>
                    )}
                    <tr key={perm.id} className="border-t">
                      <td className="sticky start-0 bg-card px-3 py-2">
                        <div>{localizedName(perm, locale)}</div>
                        <code className="text-[10px] text-muted-foreground" dir="ltr">{perm.code}</code>
                      </td>
                      {data.data!.roles.map((r) => {
                        const key = `${r.id}:${perm.id}`;
                        const on = data.data!.granted.has(key);
                        const locked = r.code === "SUPER_ADMIN";
                        return (
                          <td key={r.id} className="px-2 py-2 text-center">
                            <Checkbox
                              checked={on}
                              disabled={!editable || locked || toggle.isPending}
                              aria-label={`${r.code} ${perm.code}`}
                              onCheckedChange={(c) => toggle.mutate({ roleId: r.id, permId: perm.id, grant: !!c })}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}