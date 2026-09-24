import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowRight, Archive, ArchiveRestore, Pencil } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { DemoBadge, EmptyState, ErrorState, LoadingState, PageHeader, StatusBadge } from "@/components/common/States";
import { RequirePermission } from "@/components/layout/AppShell";
import { PersonnelFormDialog } from "@/components/personnel/PersonnelForm";
import { STATUS_TONE } from "./index";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/use-auth";
import { useT } from "@/lib/i18n";
import { P } from "@/lib/permissions";

export const Route = createFileRoute("/_authenticated/personnel/$id")({
  head: () => ({ meta: [{ title: "ملف الفرد — BMS" }] }),
  component: () => (
    <RequirePermission anyOf={[P.personnelRead]}>
      <PersonnelDetail />
    </RequirePermission>
  ),
});

function Row({ label, value }: { label: string; value?: string | null | undefined }) {
  return (
    <div className="flex justify-between gap-4 border-b py-2 text-sm last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-end font-medium">{value || "—"}</span>
    </div>
  );
}

function PersonnelDetail() {
  const { id } = Route.useParams();
  const t = useT();
  const qc = useQueryClient();
  const { can } = useAuth();
  const [edit, setEdit] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);

  const person = useQuery({
    queryKey: ["personnel", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("personnel").select("*, units(id, name_ar, code)").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const housing = useQuery({
    queryKey: ["personnel", id, "housing"],
    enabled: can(P.housingRead),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("room_assignments")
        .select("id, started_at, rooms(room_number, buildings(name_ar))")
        .eq("personnel_id", id).is("ended_at", null).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const leaves = useQuery({
    queryKey: ["personnel", id, "leaves"],
    enabled: can(P.leaveRead),
    queryFn: async () => {
      const { data, error } = await supabase.from("leave_requests").select("id, leave_type, start_date, end_date, status")
        .eq("personnel_id", id).order("start_date", { ascending: false }).limit(5);
      if (error) throw error;
      return data;
    },
  });
  const attendance = useQuery({
    queryKey: ["personnel", id, "attendance"],
    enabled: can(P.attendanceRead),
    queryFn: async () => {
      const { data, error } = await supabase.from("attendance_records").select("id, record_date, status, check_in")
        .eq("personnel_id", id).order("record_date", { ascending: false }).limit(7);
      if (error) throw error;
      return data;
    },
  });

  const archive = useMutation({
    mutationFn: async (toArchived: boolean) => {
      const { error } = await supabase.from("personnel")
        .update({ status: toArchived ? "ARCHIVED" : "ACTIVE" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t.common.saved);
      qc.invalidateQueries({ queryKey: ["personnel"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setConfirmArchive(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (person.isLoading) return <LoadingState />;
  if (person.error) return <ErrorState error={person.error} onRetry={() => person.refetch()} />;
  if (!person.data) return <EmptyState title={t.common.empty} action={<Button asChild variant="outline"><Link to="/personnel">{t.common.back}</Link></Button>} />;

  const p = person.data;
  const isArchived = p.status === "ARCHIVED";

  return (
    <div>
      <Link to="/personnel" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowRight className="size-4 rtl:rotate-0 ltr:rotate-180" /> {t.personnel.title}
      </Link>
      <PageHeader
        title={`${p.rank} ${p.first_name} ${p.last_name}`}
        subtitle={p.personnel_number}
        actions={
          <>
            {p.is_demo && <DemoBadge />}
            <StatusBadge label={t.personnel.status[p.status]} tone={STATUS_TONE[p.status]} />
            {can(P.personnelUpdate) && !isArchived && (
              <Button variant="outline" onClick={() => setEdit(true)}>
                <Pencil className="size-4" /> {t.common.edit}
              </Button>
            )}
            {can(P.personnelArchive) && (
              <Button variant={isArchived ? "secondary" : "destructive"} onClick={() => setConfirmArchive(true)}>
                {isArchived ? <ArchiveRestore className="size-4" /> : <Archive className="size-4" />}
                {isArchived ? t.personnel.restore : t.personnel.archive}
              </Button>
            )}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="surface-panel p-5 lg:col-span-2">
          <h2 className="mb-2 text-sm font-semibold">{t.personnel.detail}</h2>
          <div className="grid gap-x-8 sm:grid-cols-2">
            <div>
              <Row label={t.personnel.number} value={p.personnel_number} />
              <Row label={t.personnel.rank} value={p.rank} />
              <Row label={t.personnel.fatherName} value={p.father_name} />
              <Row label={t.personnel.unit} value={p.units?.name_ar} />
              <Row label={t.personnel.dob} value={p.date_of_birth} />
              <Row label={t.personnel.enlistment} value={p.enlistment_date} />
            </div>
            <div>
              <Row label={t.personnel.phone} value={p.phone} />
              <Row label={t.common.email} value={p.email} />
              <Row label={t.personnel.bloodType} value={p.blood_type} />
              <Row label={t.personnel.address} value={p.address} />
              <Row label={t.common.notes} value={p.notes} />
              <Row label={t.common.createdAt} value={new Date(p.created_at).toLocaleDateString("en-GB")} />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {can(P.housingRead) && (
            <div className="surface-panel p-5">
              <h2 className="mb-2 text-sm font-semibold">{t.personnel.housing}</h2>
              {housing.isLoading ? <p className="text-xs text-muted-foreground">{t.common.loading}</p>
                : housing.data ? (
                  <p className="text-sm">{housing.data.rooms?.buildings?.name_ar} — {housing.data.rooms?.room_number}
                    <span className="block text-xs text-muted-foreground" dir="ltr">{housing.data.started_at}</span></p>
                ) : <p className="text-sm text-muted-foreground">{t.personnel.noHousing}</p>}
            </div>
          )}
          {can(P.leaveRead) && (
            <div className="surface-panel p-5">
              <h2 className="mb-2 text-sm font-semibold">{t.personnel.leaves}</h2>
              {!leaves.data?.length ? <p className="text-sm text-muted-foreground">{t.common.empty}</p> : (
                <ul className="space-y-1 text-sm">
                  {leaves.data.map((l) => (
                    <li key={l.id} className="flex justify-between gap-2">
                      <span dir="ltr">{l.start_date} → {l.end_date}</span>
                      <span className="text-xs text-muted-foreground">{l.status}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {can(P.attendanceRead) && (
            <div className="surface-panel p-5">
              <h2 className="mb-2 text-sm font-semibold">{t.personnel.attendance}</h2>
              {!attendance.data?.length ? <p className="text-sm text-muted-foreground">{t.common.empty}</p> : (
                <ul className="space-y-1 text-sm">
                  {attendance.data.map((a) => (
                    <li key={a.id} className="flex justify-between gap-2">
                      <span dir="ltr">{a.record_date}</span>
                      <span className="text-xs text-muted-foreground">{a.status}{a.check_in ? ` · ${a.check_in.slice(0, 5)}` : ""}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>

      <PersonnelFormDialog open={edit} onOpenChange={setEdit} person={p} />

      <AlertDialog open={confirmArchive} onOpenChange={setConfirmArchive}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isArchived ? t.personnel.restore : t.personnel.archive}</AlertDialogTitle>
            <AlertDialogDescription>{isArchived ? `${p.first_name} ${p.last_name}` : t.personnel.archiveConfirm}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); archive.mutate(!isArchived); }} disabled={archive.isPending}>
              {t.common.confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}