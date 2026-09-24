import { useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { LogOut, Menu, ShieldCheck, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NAV_ITEMS } from "@/lib/permissions";
import { LOCALES, useLocale, useT } from "@/lib/i18n";
import { useAuth, useSignOut } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const t = useT();
  const { canAny } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav className="flex flex-col gap-0.5 px-3" aria-label="main">
      {NAV_ITEMS.filter((item) => canAny(item.anyOf)).map((item) => {
        const active = pathname.startsWith(item.to.split("/").slice(0, 2).join("/"));
        const Icon = item.icon;
        return (
          <Link
            key={item.key}
            to={item.to}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
            )}
          >
            <Icon className="size-4 shrink-0" />
            <span className="flex-1">{t.nav[item.key]}</span>
            {item.upcoming && (
              <span className="rounded-sm border border-sidebar-primary/50 px-1.5 py-0.5 text-[10px] leading-none text-sidebar-primary">
                {t.common.upcoming}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

function Brand() {
  const t = useT();
  return (
    <div className="flex items-center gap-3 px-5 py-5">
      <div className="flex size-10 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
        <ShieldCheck className="size-5" />
      </div>
      <div className="leading-tight">
        <div className="text-sm font-semibold text-sidebar-accent-foreground">{t.appName}</div>
        <div className="text-[11px] text-sidebar-foreground/60">{t.appShort}</div>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const t = useT();
  const { locale, setLocale } = useLocale();
  const { profile } = useAuth();
  const signOut = useSignOut();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-e border-sidebar-border bg-sidebar lg:flex">
        <Brand />
        <div className="flex-1 overflow-y-auto py-2">
          <SidebarNav />
        </div>
        <div className="border-t border-sidebar-border px-5 py-3 text-[11px] leading-relaxed text-sidebar-foreground/55">
          {t.scopeNote}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-card/90 px-4 backdrop-blur">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="menu">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side={locale === "ar" ? "right" : "left"} className="w-72 bg-sidebar p-0 text-sidebar-foreground">
              <SheetTitle className="sr-only">{t.appName}</SheetTitle>
              <Brand />
              <SidebarNav onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>

          <div className="flex-1" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2" aria-label={t.common.language}>
                <Languages className="size-4" />
                <span className="hidden sm:inline">{LOCALES.find((l) => l.code === locale)?.label}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {LOCALES.map((l) => (
                <DropdownMenuItem key={l.code} onClick={() => setLocale(l.code)}>
                  {l.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {profile && (
            <div className="hidden text-end leading-tight sm:block">
              <div className="text-sm font-medium">{profile.full_name || profile.email}</div>
              <div className="text-[11px] text-muted-foreground">
                {profile.roles.map((r) => (locale === "ar" ? r.name_ar : locale === "fr" && r.name_fr ? r.name_fr : r.name_en)).join("، ") || t.users.noRoles}
              </div>
            </div>
          )}
          <Button variant="outline" size="sm" onClick={handleSignOut} className="gap-2">
            <LogOut className="size-4" />
            <span className="hidden sm:inline">{t.common.signOut}</span>
          </Button>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}

export function RequirePermission({ anyOf, children }: { anyOf: string[]; children: ReactNode }) {
  const { canAny, isLoading } = useAuth();
  if (isLoading) return null;
  if (!canAny(anyOf)) {
    return <ForbiddenFallback />;
  }
  return <>{children}</>;
}

function ForbiddenFallback() {
  const t = useT();
  return (
    <div className="surface-panel px-6 py-16 text-center text-sm text-muted-foreground">{t.common.forbidden}</div>
  );
}