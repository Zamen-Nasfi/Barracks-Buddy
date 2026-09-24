import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "@/hooks/use-auth";
import { useT } from "@/lib/i18n";
import { logFailedSignIn } from "@/lib/admin.functions";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "تسجيل الدخول — نظام إدارة الثكنة" },
      { name: "description", content: "الدخول إلى نظام إدارة الثكنة بحساب معتمد من إدارة النظام." },
      { property: "og:title", content: "تسجيل الدخول — BMS" },
      { property: "og:description", content: "الدخول إلى نظام إدارة الثكنة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

const schema = z.object({
  fullName: z.string().optional(),
  email: z.string().email("بريد إلكتروني غير صالح"),
  password: z.string().min(8, "كلمة المرور 8 أحرف على الأقل"),
});
type FormValues = z.infer<typeof schema>;

function AuthPage() {
  const t = useT();
  const navigate = useNavigate();
  const session = useSession();
  const [mode, setMode] = useState<"signin" | "bootstrap">("signin");

  const bootstrapped = useQuery({
    queryKey: ["system-bootstrapped"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("system_bootstrapped");
      if (error) throw error;
      return data as boolean;
    },
  });

  useEffect(() => {
    if (bootstrapped.data === false) setMode("bootstrap");
  }, [bootstrapped.data]);

  useEffect(() => {
    if (session) navigate({ to: "/dashboard", replace: true });
  }, [session, navigate]);

  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { email: "", password: "", fullName: "" } });
  const busy = form.formState.isSubmitting;

  const onSubmit = async (values: FormValues) => {
    if (mode === "bootstrap") {
      if (!values.fullName || values.fullName.trim().length < 2) {
        form.setError("fullName", { message: t.common.required });
        return;
      }
      const { error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: { emailRedirectTo: window.location.origin, data: { full_name: values.fullName.trim() } },
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success(t.common.saved);
      return; // onAuthStateChange delivers the session and the effect redirects
    }
    const { error } = await supabase.auth.signInWithPassword({ email: values.email, password: values.password });
    if (error) {
      logFailedSignIn({ data: { email: values.email } }).catch(() => {});
      toast.error(t.auth.invalid);
      return;
    }
    await supabase.rpc("log_audit", { _action: "auth.sign_in", _entity_type: "auth", _entity_id: "" });
  };

  return (
    <div className="auth-backdrop flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ShieldCheck className="size-6" />
          </div>
          <div className="leading-tight">
            <div className="text-lg font-semibold">{t.appName}</div>
            <div className="text-xs text-muted-foreground">{t.scopeNote}</div>
          </div>
        </div>

        <div className="surface-panel p-6 sm:p-8">
          <h1 className="text-xl font-semibold">{mode === "bootstrap" ? t.auth.bootstrapTitle : t.auth.signInTitle}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "bootstrap" ? t.auth.bootstrapSub : t.auth.signInSub}
          </p>

          <form className="mt-6 space-y-4" onSubmit={form.handleSubmit(onSubmit)} noValidate>
            {mode === "bootstrap" && (
              <div className="space-y-1.5">
                <Label htmlFor="fullName">{t.auth.fullName}</Label>
                <Input id="fullName" autoComplete="name" {...form.register("fullName")} />
                {form.formState.errors.fullName && (
                  <p className="text-xs text-destructive">{form.formState.errors.fullName.message}</p>
                )}
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">{t.common.email}</Label>
              <Input id="email" type="email" dir="ltr" autoComplete="email" {...form.register("email")} />
              {form.formState.errors.email && <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">{t.common.password}</Label>
              <Input id="password" type="password" dir="ltr" autoComplete={mode === "bootstrap" ? "new-password" : "current-password"} {...form.register("password")} />
              {form.formState.errors.password && <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={busy || bootstrapped.isLoading}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              {mode === "bootstrap" ? t.auth.createAccount : t.auth.signIn}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}