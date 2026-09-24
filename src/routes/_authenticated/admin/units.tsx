import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { DemoBadge, EmptyState, ErrorState, LoadingState, PageHeader, StatusBadge } from "@/components/common/States";
import { RequirePermission } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/hooks/use-auth";
import { useT } from "@/lib/i18n";
import { P } from "@/lib/permissions";

export const Route = createFileRoute("/_authenticated/admin/units")({
  head: () => ({ meta: [{ title: "الوحدات — BMS" }] }),
  component: () => (
    <RequirePermission anyOf={[P.unitsRead]}>
      <UnitsPage />
    </RequirePermission>
  ),
});

type Unit = Tables<"units"> & { personnel: { count: number }[] };
const NONE = "__none__";
const TYPES = ["HQ", "BATTALION", "COMPANY", "PLATOON", "SECTION", "SERVICE"] as const;

const schema = z.object({
  code: z.string().trim().min(2, "مطلوب").max(20),
  name_ar: z.string().trim().min(2, "مطلوب"),
  name_en: z.string().trim().optional(),
  name_fr: z.string().trim().optional(),
  unit_type: z.string().min(1),
  parent_id: z.string().optional(),
  location: z.string().trim().optional(),
  is_active: z.boolean(),
});
type Values = z.infer<typeof schema>;

function UnitsPage() {
  const t = useT();
  const { can } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Unit | null>(null);

  const units = useQuery({
    queryKey: ["units"],
    queryFn: async () => {
      const { data, error } = await supabase.from("units").select("*, personnel(count)").order("code");
      if (error) throw error;
      return data as Unit[];
    },
  });

  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { unit_type: "COMPANY", parent_id: NONE, is_active: true } });
  useEffect(() => {
    if (!open) return;
    form.reset({
      code: editing?.code ?? "", name_ar: editing?.name_ar ?? "", name_en: editing?.name_en ?? "", name_fr: editing?.name_fr ?? "",
      unit_type: editing?.unit_type ?? "COMPANY", parent_id: editing?.parent_id ?? NONE, location: editing?.location ?? "",
      is_active: editing?.is_active ?? true,
    });
  }, [open, editing, form]);

  const save = useMutation({
    mutationFn: async (v: Values) => {
      const payload = {
        code: v.code, name_ar: v.name_ar, name_en: v.name_en || null, name_fr: v.name_fr || null, unit_type: v.unit_type,
        parent_id: v.parent_id && v.parent_id !== NONE ? v.parent_id : null, location: v.location || null, is_active: v.is_active,
      };
      const { error } = editing
        ? await supabase.from("units").update(payload).eq("id", editing.id)
        : await supabase.from("units").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t.common.saved); setOpen(false); setEditing(null);
      qc.invalidateQueries({ queryKey: ["units"] }); qc.invalidateQueries({ queryKey: ["units-options"] }); qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
    onError: (e: { code?: string; message: string }) => {
      if (e.code === "23505") form.setError("code", { message: "الرمز مستخدم مسبقاً" });
      else toast.error(e.message);
    },
  });

  const byId = new Map((units.data ?? []).map((u) => [u.id, u]));
  const err = form.formState.errors;

  return (
    <div>
      <PageHeader title={t.units.title} subtitle={t.units.subtitle}
        actions={can(P.unitsManage) && <Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="size-4" /> {t.units.add}</Button>} />
      <AdminTabs />
      {units.isLoading ? <LoadingState /> : units.error ? <ErrorState error={units.error} onRetry={() => units.refetch()} />
        : !units.data?.length ? <EmptyState /> : (
        <div className="surface-panel overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.units.code}</TableHead>
                <TableHead>{t.common.name}</TableHead>
                <TableHead className="hidden md:table-cell">{t.units.type}</TableHead>
                <TableHead className="hidden md:table-cell">{t.units.parent}</TableHead>
                <TableHead className="hidden sm:table-cell">{t.units.personnelCount}</TableHead>
                <TableHead>{t.common.status}</TableHead>
                {can(P.unitsManage) && <TableHead className="text-end">{t.common.actions}</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {units.data.map((u) => (
                <TableRow key={u.id}>
                  <TableCell dir="ltr" className="text-start font-mono text-xs">{u.code}</TableCell>
                  <TableCell className="font-medium"><span className="flex items-center gap-2">{u.name_ar}{u.is_demo && <DemoBadge />}</span></TableCell>
                  <TableCell className="hidden md:table-cell">{t.units.types[u.unit_type] ?? u.unit_type}</TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">{u.parent_id ? byId.get(u.parent_id)?.name_ar : "—"}</TableCell>
                  <TableCell className="hidden tabular-nums sm:table-cell">{u.personnel?.[0]?.count ?? 0}</TableCell>
                  <TableCell><StatusBadge label={u.is_active ? t.common.active : t.common.inactive} tone={u.is_active ? "success" : "muted"} /></TableCell>
                  {can(P.unitsManage) && (
                    <TableCell className="text-end">
                      <Button size="sm" variant="outline" onClick={() => { setEditing(u); setOpen(true); }}><Pencil className="size-4" /> {t.common.edit}</Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editing ? t.common.edit : t.units.add}</DialogTitle></DialogHeader>
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={form.handleSubmit((v) => save.mutate(v))} noValidate>
            <div className="space-y-1.5"><Label>{t.units.code}</Label><Input dir="ltr" {...form.register("code")} />{err.code && <p className="text-xs text-destructive">{err.code.message}</p>}</div>
            <div className="space-y-1.5"><Label>{t.units.type}</Label>
              <Select value={form.watch("unit_type")} onValueChange={(v) => form.setValue("unit_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TYPES.map((ty) => <SelectItem key={ty} value={ty}>{t.units.types[ty]}</SelectItem>)}</SelectContent>
              </Select></div>
            <div className="space-y-1.5 sm:col-span-2"><Label>{t.units.nameAr}</Label><Input {...form.register("name_ar")} />{err.name_ar && <p className="text-xs text-destructive">{err.name_ar.message}</p>}</div>
            <div className="space-y-1.5"><Label>{t.units.nameEn}</Label><Input dir="ltr" {...form.register("name_en")} /></div>
            <div className="space-y-1.5"><Label>{t.units.nameFr}</Label><Input dir="ltr" {...form.register("name_fr")} /></div>
            <div className="space-y-1.5"><Label>{t.units.parent}</Label>
              <Select value={form.watch("parent_id") ?? NONE} onValueChange={(v) => form.setValue("parent_id", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>—</SelectItem>
                  {units.data?.filter((u) => u.id !== editing?.id).map((u) => <SelectItem key={u.id} value={u.id}>{u.name_ar}</SelectItem>)}
                </SelectContent>
              </Select></div>
            <div className="space-y-1.5"><Label>{t.units.location}</Label><Input {...form.register("location")} /></div>
            <div className="flex items-center gap-2 sm:col-span-2">
              <Switch id="unit-active" checked={form.watch("is_active")} onCheckedChange={(c) => form.setValue("is_active", c)} />
              <Label htmlFor="unit-active">{t.common.active}</Label>
            </div>
            <DialogFooter className="sm:col-span-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t.common.cancel}</Button>
              <Button type="submit" disabled={save.isPending}>{save.isPending && <Loader2 className="size-4 animate-spin" />}{t.common.save}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}