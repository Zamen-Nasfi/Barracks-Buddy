import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AuthProfile = {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  roles: { code: string; name_ar: string; name_en: string; name_fr: string | null }[];
  permissions: string[];
};

async function loadProfile(userId: string): Promise<AuthProfile | null> {
  // Ensures the profile row exists and grants SUPER_ADMIN on the very first sign-in.
  const { error: bootErr } = await supabase.rpc("bootstrap_profile");
  if (bootErr) throw bootErr;

  const [{ data: profile, error: pErr }, { data: perms, error: permErr }, { data: ur, error: urErr }] =
    await Promise.all([
      supabase.from("profiles").select("id, email, full_name, is_active").eq("id", userId).maybeSingle(),
      supabase.rpc("my_permissions"),
      supabase.from("user_roles").select("roles(code, name_ar, name_en, name_fr)").eq("user_id", userId),
    ]);
  if (pErr) throw pErr;
  if (permErr) throw permErr;
  if (urErr) throw urErr;
  if (!profile) return null;
  return {
    ...profile,
    roles: (ur ?? []).map((r) => r.roles).filter(Boolean) as AuthProfile["roles"],
    permissions: (perms ?? []) as string[],
  };
}

export function useSession() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    return () => sub.subscription.unsubscribe();
  }, []);
  return session;
}

export function useAuth() {
  const session = useSession();
  const userId = session?.user.id;
  const query = useQuery({
    queryKey: ["auth-profile", userId],
    queryFn: () => loadProfile(userId!),
    enabled: !!userId,
    staleTime: 60_000,
  });
  const permissions = query.data?.permissions ?? [];
  const can = (perm: string) => permissions.includes(perm);
  const canAny = (perms: string[]) => perms.length === 0 || perms.some(can);
  return { session, user: session?.user ?? null, profile: query.data ?? null, isLoading: session === undefined || (!!userId && query.isLoading), error: query.error, can, canAny, refetch: query.refetch };
}

export function useSignOut() {
  const qc = useQueryClient();
  return async () => {
    await supabase.rpc("log_audit", { _action: "auth.sign_out", _entity_type: "auth", _entity_id: "" });
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
  };
}