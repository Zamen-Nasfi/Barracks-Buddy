import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { EmptyState, ErrorState, LoadingState, PageHeader } from "@/components/common/States";
import { RequirePermission } from "@/components/layout/AppShell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useT } from "@/lib/i18n";
import { P } from "@/lib/permissions";

export const Route = createFileRoute("/_authenticated/admin/audit")({
  head: () => ({ meta: [{ title: "سجل التدقيق — BMS" }] }),
  component: () => (
    <RequirePermission anyOf={[P.auditRead]}>
      <AuditPage />
    </RequirePermission>
  ),
});

const PAGE = 50;

function AuditPage() {
  const t = useT();
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState<number | null>(null);

  const logs = useQuery({
    queryKey: ["audit-logs", filter, page],
    queryFn: async () => {
      let q = supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).range(page * PAGE, page * PAGE + PAGE - 1);
      const f = filter.trim().replace(/[%,]/g, "");
      if (f) q = q.or(`action.ilike.%${f}%,entity_type.ilike.%${f}%,actor_email.ilike.%${f}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  return (
    <div>
      <PageHeader title={t.audit.title} subtitle={t.audit.subtitle} />
      <AdminTabs />
      <div className="mb-4 max-w-sm">
        <Input placeholder={t.common.search} value={filter} onChange={(e) => { setFilter(e.target.value); setPage(0); }} />
      </div>
      {logs.isLoading ? <LoadingState rows={8} /> : logs.error ? <ErrorState error={logs.error} onRetry={() => logs.refetch()} />
        : !logs.data?.length ? <EmptyState /> : (
        <div className="surface-panel overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.audit.when}</TableHead>
                <TableHead>{t.audit.actor}</TableHead>
                <TableHead>{t.audit.action}</TableHead>
                <TableHead className="hidden md:table-cell">{t.audit.entity}</TableHead>
                <TableHead className="text-end">{t.audit.details}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.data.map((l) => (
                <>
                  <TableRow key={l.id}>
                    <TableCell dir="ltr" className="text-start text-xs tabular-nums">{new Date(l.created_at).toLocaleString("en-GB")}</TableCell>
                    <TableCell dir="ltr" className="text-start text-xs">{l.actor_email ?? t.audit.system}</TableCell>
                    <TableCell><code className="text-xs" dir="ltr">{l.action}</code></TableCell>
                    <TableCell className="hidden md:table-cell" dir="ltr"><span className="text-xs">{l.entity_type}</span>{l.entity_id && <span className="block truncate text-[10px] text-muted-foreground">{l.entity_id}</span>}</TableCell>
                    <TableCell className="text-end">
                      <Button size="sm" variant="ghost" onClick={() => setExpanded(expanded === l.id ? null : l.id)}>
                        {expanded === l.id ? t.common.close : t.audit.details}
                      </Button>
                    </TableCell>
                  </TableRow>
                  {expanded === l.id && (
                    <TableRow key={`${l.id}-d`} className="bg-muted/40 hover:bg-muted/40">
                      <TableCell colSpan={5}>
                        <pre dir="ltr" className="max-h-64 overflow-auto whitespace-pre-wrap break-all text-[11px] leading-relaxed text-muted-foreground">
                          {JSON.stringify({ old: l.old_data, new: l.new_data, metadata: l.metadata }, null, 2)}
                        </pre>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
            </TableBody>
          </Table>
          <div className="flex items-center justify-between border-t px-4 py-2 text-xs text-muted-foreground">
            <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>‹</Button>
            <span dir="ltr">{page + 1}</span>
            <Button size="sm" variant="outline" disabled={(logs.data?.length ?? 0) < PAGE} onClick={() => setPage((p) => p + 1)}>›</Button>
          </div>
        </div>
      )}
    </div>
  );
}