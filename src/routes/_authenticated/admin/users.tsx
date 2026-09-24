import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Loader2, UserCog } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { createUser, updateUser } from "@/lib/admin.functions";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { EmptyState, ErrorState, LoadingState, PageHeader, StatusBadge } from "@/components/common/States";
import { RequirePermission } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/hooks/use-auth";
import { localizedName, useLocale, useT } from "@/lib/i18n";
import { P } from "@/lib/permissions";

export const Route = createFileRoute("/_authenticated/admin/users")({
  head: () => ({ meta: [{ title: "المستخدمون — BMS" }] }),
  component: () => (
    <RequirePermission anyOf={[P.usersRead]}>
      <UsersPage />
    </RequirePermission>
  ),
});

const createSchema = z.object({
  fullName: z.string().trim().min(2, "مطلوب"),
  email: z.string().email("بريد غير صالح"),
  password: z.string().min(8, "8 أحرف على الأقل"),
  roleIds: z.array(z.string()).min(1, "اختر دوراً واحداً على الأقل"),
});
type CreateValues = z.infer<typeof createSchema>;

type UserRow = {
  id: string; email: string; full_name: string; is_active: boolean; created_at: string;
  user_roles: { role_id: string; roles: { code: string; name_ar: string; name_en: string; name_fr: string | null } | null }[];
};

function UsersPage() {
  const t = useT();
  const { locale } = useLocale();
  const { can, user, refetch: refetchAuth } = useAuth();
  const qc = useQueryClient();
  const createFn = useServerFn(createUser);
  const updateFn = useServerFn(updateUser);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [toggling, setToggling] = useState<UserRow | null>(null);

  const users = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles")
        .select("id, email, full_name, is_active, created_at, user_roles(role_id, roles(code, name_ar, name_en, name_fr))")
        .order("created_at");
      if (error) throw error;
      return data as UserRow[];
    },
  });
  const roles = useQuery({
    queryKey: ["roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("roles").select("id, code, name_ar, name_en, name_fr").order("code");
      if (error) throw error;
      return data;
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-users"] });
    qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    refetchAuth();
  };

  const form = useForm<CreateValues>({ resolver: zodResolver(createSchema), defaultValues: { roleIds: [] } });
  const createMut = useMutation({
    mutationFn: (v: CreateValues) => createFn({ data: v }),
    onSuccess: () => { toast.success(t.common.saved); setCreateOpen(false); form.reset({ roleIds: [] }); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const [editRoles, setEditRoles] = useState<string[]>([]);
  const [editName, setEditName] = useState("");
  const openEdit = (u: UserRow) => { setEditing(u); setEditRoles(u.user_roles.map((r) => r.role_id)); setEditName(u.full_name); };
  const updateMut = useMutation({
    mutationFn: (v: { userId: string; fullName?: string; isActive?: boolean; roleIds?: string[] }) => updateFn({ data: v }),
    onSuccess: () => { toast.success(t.common.saved); setEditing(null); setToggling(null); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const roleLabel = (r: { name_ar: string; name_en: string; name_fr: string | null }) => localizedName(r, locale);

  return (
    <div>
      <PageHeader
        title={t.users.title}
        subtitle={t.users.subtitle}
        actions={can(P.usersManage) && (
          <Button onClick={() => setCreateOpen(true)}><Plus className="size-4" /> {t.users.add}</Button>
        )}
      />
      <AdminTabs />

      {users.isLoading ? <LoadingState /> : users.error ? <ErrorState error={users.error} onRetry={() => users.refetch()} />
        : !users.data?.length ? <EmptyState /> : (
        <div className="surface-panel overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.common.name}</TableHead>
                <TableHead>{t.common.email}</TableHead>
                <TableHead>{t.users.roles}</TableHead>
                <TableHead>{t.common.status}</TableHead>
                {can(P.usersManage) && <TableHead className="text-end">{t.common.actions}</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.data.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">
                    {u.full_name || "—"} {u.id === user?.id && <span className="text-xs text-muted-foreground">({t.users.you})</span>}
                  </TableCell>
                  <TableCell dir="ltr" className="text-start text-sm">{u.email}</TableCell>
                  <TableCell className="text-sm">
                    {u.user_roles.length ? u.user_roles.map((r) => r.roles && roleLabel(r.roles)).filter(Boolean).join("، ") : <span className="text-muted-foreground">{t.users.noRoles}</span>}
                  </TableCell>
                  <TableCell><StatusBadge label={u.is_active ? t.common.active : t.common.inactive} tone={u.is_active ? "success" : "muted"} /></TableCell>
                  {can(P.usersManage) && (
                    <TableCell className="text-end">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEdit(u)}><UserCog className="size-4" /> {t.common.edit}</Button>
                        {u.id !== user?.id && (
                          <Button size="sm" variant={u.is_active ? "destructive" : "secondary"} onClick={() => setToggling(u)}>
                            {u.is_active ? t.users.deactivate : t.users.activate}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t.users.add}</DialogTitle></DialogHeader>
          <form className="space-y-4" onSubmit={form.handleSubmit((v) => createMut.mutate(v))} noValidate>
            <div className="space-y-1.5">
              <Label>{t.auth.fullName}</Label>
              <Input {...form.register("fullName")} />
              {form.formState.errors.fullName && <p className="text-xs text-destructive">{form.formState.errors.fullName.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>{t.common.email}</Label>
              <Input dir="ltr" type="email" {...form.register("email")} />
              {form.formState.errors.email && <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>{t.common.password}</Label>
              <Input dir="ltr" type="password" autoComplete="new-password" {...form.register("password")} />
              {form.formState.errors.password && <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>{t.users.roles}</Label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {roles.data?.map((r) => {
                  const selected = form.watch("roleIds").includes(r.id);
                  return (
                    <label key={r.id} className="flex items-center gap-2 rounded-md border p-2 text-sm">
                      <Checkbox checked={selected} onCheckedChange={(c) => {
                        const cur = form.getValues("roleIds");
                        form.setValue("roleIds", c ? [...cur, r.id] : cur.filter((x) => x !== r.id), { shouldValidate: true });
                      }} />
                      {roleLabel(r)}
                    </label>
                  );
                })}
              </div>
              {form.formState.errors.roleIds && <p className="text-xs text-destructive">{form.formState.errors.roleIds.message}</p>}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>{t.common.cancel}</Button>
              <Button type="submit" disabled={createMut.isPending}>{createMut.isPending && <Loader2 className="size-4 animate-spin" />}{t.common.save}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t.common.edit} — {editing?.email}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t.auth.fullName}</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t.users.roles}</Label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {roles.data?.map((r) => (
                  <label key={r.id} className="flex items-center gap-2 rounded-md border p-2 text-sm">
                    <Checkbox checked={editRoles.includes(r.id)} onCheckedChange={(c) =>
                      setEditRoles((cur) => (c ? [...cur, r.id] : cur.filter((x) => x !== r.id)))} />
                    {roleLabel(r)}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>{t.common.cancel}</Button>
            <Button disabled={updateMut.isPending || editName.trim().length < 2}
              onClick={() => editing && updateMut.mutate({ userId: editing.id, fullName: editName.trim(), roleIds: editRoles })}>
              {updateMut.isPending && <Loader2 className="size-4 animate-spin" />}{t.common.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Toggle active */}
      <AlertDialog open={!!toggling} onOpenChange={(o) => !o && setToggling(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{toggling?.is_active ? t.users.deactivate : t.users.activate} — {toggling?.email}</AlertDialogTitle>
            {toggling?.is_active && <AlertDialogDescription>{t.users.deactivateConfirm}</AlertDialogDescription>}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); toggling && updateMut.mutate({ userId: toggling.id, isActive: !toggling.is_active }); }}>
              {t.common.confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}