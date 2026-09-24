import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ShieldCheck, Users, Building2, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/use-auth";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "نظام إدارة الثكنة — BMS | الدخول" },
      { name: "description", content: "بوابة الدخول إلى نظام إدارة الثكنة: إدارة الأفراد والوحدات والإقامة والمخزون والصيانة والإعاشة." },
      { property: "og:title", content: "نظام إدارة الثكنة — BMS" },
      { property: "og:description", content: "نظام إداري ولوجستي لإدارة الثكنة (غير عملياتي)." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const session = useSession();
  const navigate = useNavigate();
  const t = useT();

  useEffect(() => {
    if (session) navigate({ to: "/dashboard", replace: true });
  }, [session, navigate]);

  return (
    <div className="auth-backdrop flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-2xl text-center">
        <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg">
          <ShieldCheck className="size-8" />
        </div>
        <h1 className="text-3xl font-semibold sm:text-4xl">{t.appName}</h1>
        <p className="mx-auto mt-3 max-w-lg text-muted-foreground">{t.scopeNote}</p>
        <div className="mt-8">
          <Button asChild size="lg" className="px-8">
            <Link to="/auth">{t.auth.signIn}</Link>
          </Button>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-4 text-start sm:grid-cols-3">
          {[
            { icon: Users, title: t.nav.personnel, body: t.personnel.subtitle },
            { icon: Building2, title: t.nav.housing, body: "المباني والغرف وتخصيصات الإقامة" },
            { icon: ClipboardList, title: t.nav.admin, body: "المستخدمون والأدوار والوحدات وسجل التدقيق" },
          ].map((f) => (
            <div key={f.title} className="surface-panel p-4">
              <f.icon className="mb-2 size-5 text-brass" />
              <div className="font-medium">{f.title}</div>
              <div className="mt-1 text-xs text-muted-foreground">{f.body}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}