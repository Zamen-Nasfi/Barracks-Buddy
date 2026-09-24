import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(2),
  roleIds: z.array(z.string().uuid()).min(1),
});

/** Admin creates a login for a staff member. Requires users.manage. Logged to audit. */
export const createUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => createUserSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: allowed } = await context.supabase.rpc("has_permission", {
      _user_id: context.userId,
      _perm: "users.manage",
    });
    if (!allowed) throw new Error("FORBIDDEN");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName },
    });
    if (error || !created.user) throw new Error(error?.message ?? "CREATE_FAILED");
    const uid = created.user.id;

    const { error: pErr } = await supabaseAdmin
      .from("profiles")
      .insert({ id: uid, email: data.email, full_name: data.fullName });
    if (pErr) throw new Error(pErr.message);

    const { error: rErr } = await supabaseAdmin
      .from("user_roles")
      .insert(data.roleIds.map((role_id) => ({ user_id: uid, role_id, assigned_by: context.userId })));
    if (rErr) throw new Error(rErr.message);

    await context.supabase.rpc("log_audit", {
      _action: "users.create",
      _entity_type: "profiles",
      _entity_id: uid,
      _new: { email: data.email, full_name: data.fullName, role_ids: data.roleIds },
    });
    return { id: uid };
  });

const updateUserSchema = z.object({
  userId: z.string().uuid(),
  fullName: z.string().min(2).optional(),
  isActive: z.boolean().optional(),
  roleIds: z.array(z.string().uuid()).optional(),
});

/** Update name / active flag / role set. Runs as the caller (RLS + triggers apply). */
export const updateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => updateUserSchema.parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    if (data.fullName !== undefined || data.isActive !== undefined) {
      const patch: { full_name?: string; is_active?: boolean } = {};
      if (data.fullName !== undefined) patch.full_name = data.fullName;
      if (data.isActive !== undefined) patch.is_active = data.isActive;
      const { error } = await sb.from("profiles").update(patch).eq("id", data.userId);
      if (error) throw new Error(error.message);
    }
    if (data.roleIds) {
      const { data: current, error: cErr } = await sb.from("user_roles").select("id, role_id").eq("user_id", data.userId);
      if (cErr) throw new Error(cErr.message);
      const currentIds = new Set((current ?? []).map((r) => r.role_id));
      const wanted = new Set(data.roleIds);
      const toAdd = data.roleIds.filter((id) => !currentIds.has(id));
      const toRemove = (current ?? []).filter((r) => !wanted.has(r.role_id)).map((r) => r.id);
      if (toAdd.length) {
        const { error } = await sb.from("user_roles").insert(toAdd.map((role_id) => ({ user_id: data.userId, role_id, assigned_by: context.userId })));
        if (error) throw new Error(error.message);
      }
      if (toRemove.length) {
        const { error } = await sb.from("user_roles").delete().in("id", toRemove);
        if (error) throw new Error(error.message);
      }
    }
    await sb.rpc("log_audit", {
      _action: "users.update",
      _entity_type: "profiles",
      _entity_id: data.userId,
      _new: { full_name: data.fullName, is_active: data.isActive, role_ids: data.roleIds },
    });
    return { ok: true };
  });

/** Records a failed sign-in attempt (email only) in the audit log. */
export const logFailedSignIn = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ email: z.string().email() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("audit_logs").insert({
      action: "auth.sign_in_failed",
      entity_type: "auth",
      actor_email: data.email,
      metadata: { actor_email: data.email },
    });
    return { ok: true };
  });