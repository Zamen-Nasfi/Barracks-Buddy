import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useT } from "@/lib/i18n";
import { BLOOD_TYPES, RANKS } from "@/lib/permissions";

export type Personnel = Tables<"personnel">;

const NONE = "__none__";

const schema = z.object({
  personnel_number: z.string().trim().min(2, "مطلوب").max(32),
  first_name: z.string().trim().min(2, "مطلوب"),
  last_name: z.string().trim().min(2, "مطلوب"),
  father_name: z.string().trim().optional(),
  rank: z.string().min(1, "مطلوب"),
  unit_id: z.string().optional(),
  status: z.enum(["ACTIVE", "ON_LEAVE", "TRANSFERRED", "RETIRED"]),
  date_of_birth: z.string().optional(),
  enlistment_date: z.string().optional(),
  phone: z.string().trim().optional(),
  email: z.string().trim().email("بريد غير صالح").optional().or(z.literal("")),
  blood_type: z.string().optional(),
  address: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});
type Values = z.infer<typeof schema>;

function Field({ label, error, children }: { label: string; error?: string | undefined; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function PersonnelFormDialog({
  open, onOpenChange, person, onSaved,
}: { open: boolean; onOpenChange: (o: boolean) => void; person?: Personnel | null; onSaved?: (id: string) => void }) {
  const t = useT();
  const qc = useQueryClient();
  const units = useQuery({
    queryKey: ["units-options"],
    queryFn: async () => {
      const { data, error } = await supabase.from("units").select("id, code, name_ar").eq("is_active", true).order("code");
      if (error) throw error;
      return data;
    },
  });

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { status: "ACTIVE", rank: "", unit_id: NONE, blood_type: NONE },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      personnel_number: person?.personnel_number ?? "",
      first_name: person?.first_name ?? "",
      last_name: person?.last_name ?? "",
      father_name: person?.father_name ?? "",
      rank: person?.rank ?? "",
      unit_id: person?.unit_id ?? NONE,
      status: person && person.status !== "ARCHIVED" ? person.status : "ACTIVE",
      date_of_birth: person?.date_of_birth ?? "",
      enlistment_date: person?.enlistment_date ?? "",
      phone: person?.phone ?? "",
      email: person?.email ?? "",
      blood_type: person?.blood_type ?? NONE,
      address: person?.address ?? "",
      notes: person?.notes ?? "",
    });
  }, [open, person, form]);

  const mutation = useMutation({
    mutationFn: async (v: Values) => {
      const payload = {
        personnel_number: v.personnel_number,
        first_name: v.first_name,
        last_name: v.last_name,
        father_name: v.father_name || null,
        rank: v.rank,
        unit_id: v.unit_id && v.unit_id !== NONE ? v.unit_id : null,
        status: v.status,
        date_of_birth: v.date_of_birth || null,
        enlistment_date: v.enlistment_date || null,
        phone: v.phone || null,
        email: v.email || null,
        blood_type: v.blood_type && v.blood_type !== NONE ? v.blood_type : null,
        address: v.address || null,
        notes: v.notes || null,
      };
      if (person) {
        const { data, error } = await supabase.from("personnel").update(payload).eq("id", person.id).select("id").single();
        if (error) throw error;
        return data.id;
      }
      const { data: me } = await supabase.auth.getUser();
      const { data, error } = await supabase.from("personnel").insert({ ...payload, created_by: me.user?.id ?? null }).select("id").single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: (id) => {
      toast.success(t.common.saved);
      qc.invalidateQueries({ queryKey: ["personnel"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      onOpenChange(false);
      onSaved?.(id);
    },
    onError: (e: { code?: string; message: string }) => {
      if (e.code === "23505") {
        form.setError("personnel_number", { message: t.personnel.numberExists });
        return;
      }
      toast.error(e.message);
    },
  });

  const err = form.formState.errors;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{person ? t.common.edit : t.personnel.add}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="grid grid-cols-1 gap-4 sm:grid-cols-2" noValidate>
          <Field label={t.personnel.number} error={err.personnel_number?.message}>
            <Input dir="ltr" {...form.register("personnel_number")} />
          </Field>
          <Field label={t.personnel.rank} error={err.rank?.message}>
            <Select value={form.watch("rank")} onValueChange={(v) => form.setValue("rank", v, { shouldValidate: true })}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>{RANKS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label={t.personnel.firstName} error={err.first_name?.message}>
            <Input {...form.register("first_name")} />
          </Field>
          <Field label={t.personnel.lastName} error={err.last_name?.message}>
            <Input {...form.register("last_name")} />
          </Field>
          <Field label={t.personnel.fatherName}>
            <Input {...form.register("father_name")} />
          </Field>
          <Field label={t.personnel.unit}>
            <Select value={form.watch("unit_id") ?? NONE} onValueChange={(v) => form.setValue("unit_id", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>{t.personnel.noUnit}</SelectItem>
                {units.data?.map((u) => <SelectItem key={u.id} value={u.id}>{u.name_ar}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label={t.common.status}>
            <Select value={form.watch("status")} onValueChange={(v) => form.setValue("status", v as Values["status"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(["ACTIVE", "ON_LEAVE", "TRANSFERRED", "RETIRED"] as const).map((s) => (
                  <SelectItem key={s} value={s}>{t.personnel.status[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label={t.personnel.bloodType}>
            <Select value={form.watch("blood_type") ?? NONE} onValueChange={(v) => form.setValue("blood_type", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>—</SelectItem>
                {BLOOD_TYPES.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label={t.personnel.dob}>
            <Input type="date" dir="ltr" {...form.register("date_of_birth")} />
          </Field>
          <Field label={t.personnel.enlistment}>
            <Input type="date" dir="ltr" {...form.register("enlistment_date")} />
          </Field>
          <Field label={t.personnel.phone}>
            <Input dir="ltr" {...form.register("phone")} />
          </Field>
          <Field label={t.common.email} error={err.email?.message}>
            <Input dir="ltr" type="email" {...form.register("email")} />
          </Field>
          <div className="sm:col-span-2">
            <Field label={t.personnel.address}>
              <Input {...form.register("address")} />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label={t.common.notes}>
              <Textarea rows={2} {...form.register("notes")} />
            </Field>
          </div>
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t.common.cancel}</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="size-4 animate-spin" />}
              {t.common.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}