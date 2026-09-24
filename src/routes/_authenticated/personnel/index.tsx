import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { DemoBadge, EmptyState, ErrorState, LoadingState, PageHeader, StatusBadge } from "@/components/common/States";
import { RequirePermission } from "@/components/layout/AppShell";
import { PersonnelFormDialog } from "@/components/personnel/PersonnelForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/hooks/use-auth";
import { useT } from "@/lib/i18n";
import { P } from "@/lib/permissions";

export const Route = createFileRoute("/_authenticated/personnel/")({
  head: () => ({ meta: [{ title: "الأفراد — BMS" }] }),
  component: () => (
    <RequirePermission anyOf={[P.personnelRead]}>
      <PersonnelList />
    </RequirePermission>
  ),
});

export const STATUS_TONE: Record<string, "success" | "warning" | "info" | "muted" | "destructive"> = {
  ACTIVE: "success", ON_LEAVE: "warning", TRANSFERRED: "info", RETIRED: "muted", ARCHIVED: "destructive",
};

function PersonnelList() {
  const t = useT();
  const { can } = useAuth();
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [open, setOpen] = useState(false);

  const list = useQuery({
    queryKey: ["personnel", { search, showArchived }],
    queryFn: async () => {
      let q = supabase
        .from("personnel")
        .select("id, personnel_number, first_name, last_name, rank, status, is_demo, units(name_ar)")
        .order("personnel_number");
      if (!showArchived) q = q.neq("status", "ARCHIVED");
      if (search.trim()) {
        const s = search.trim().replace(/[%,]/g, "");
        q = q.or(`personnel_number.ilike.%${s}%,first_name.ilike.%${s}%,last_name.ilike.%${s}%`);
      }
      const { data, error } = await q.limit(200);
      if (error) throw error;
      return data;
    },
  });

  return (
    <div>
      <PageHeader
        title={t.personnel.title}
        subtitle={t.personnel.subtitle}
        actions={
          can(P.personnelCreate) && (
            <Button onClick={() => setOpen(true)}>
              <Plus className="size-4" /> {t.personnel.add}
            </Button>
          )
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute top-1/2 size-4 -translate-y-1/2 text-muted-foreground ltr:left-3 rtl:right-3" />
          <Input className="ps-9" placeholder={t.common.search} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <Switch id="archived" checked={showArchived} onCheckedChange={setShowArchived} />
          <Label htmlFor="archived" className="text-sm">{t.personnel.showArchived}</Label>
        </div>
      </div>

      {list.isLoading ? (
        <LoadingState />
      ) : list.error ? (
        <ErrorState error={list.error} onRetry={() => list.refetch()} />
      ) : !list.data?.length ? (
        <EmptyState description={search ? undefined : t.personnel.subtitle} />
      ) : (
        <div className="surface-panel overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.personnel.number}</TableHead>
                <TableHead>{t.common.name}</TableHead>
                <TableHead className="hidden md:table-cell">{t.personnel.rank}</TableHead>
                <TableHead className="hidden md:table-cell">{t.personnel.unit}</TableHead>
                <TableHead>{t.common.status}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.data.map((p) => (
                <TableRow key={p.id} className="cursor-pointer">
                  <TableCell dir="ltr" className="text-start font-mono text-xs">
                    <Link to="/personnel/$id" params={{ id: p.id }} className="hover:underline">{p.personnel_number}</Link>
                  </TableCell>
                  <TableCell>
                    <Link to="/personnel/$id" params={{ id: p.id }} className="flex items-center gap-2 font-medium hover:underline">
                      {p.first_name} {p.last_name}
                      {p.is_demo && <DemoBadge />}
                    </Link>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{p.rank}</TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">{p.units?.name_ar ?? t.personnel.noUnit}</TableCell>
                  <TableCell>
                    <StatusBadge label={t.personnel.status[p.status]} tone={STATUS_TONE[p.status]} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <PersonnelFormDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}