import type { ReactNode } from "react";
import { AlertTriangle, Inbox, Loader2, Lock, Construction } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useT } from "@/lib/i18n";

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function LoadingState({ rows = 5 }: { rows?: number }) {
  const t = useT();
  return (
    <div className="surface-panel p-6" role="status" aria-live="polite">
      <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> {t.common.loading}
      </div>
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    </div>
  );
}

export function EmptyState({ title, description, action }: { title?: string | undefined; description?: string | undefined; action?: ReactNode }) {
  const t = useT();
  return (
    <div className="surface-panel flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Inbox className="size-6" />
      </div>
      <h3 className="text-base font-medium">{title ?? t.common.empty}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error?: unknown; onRetry?: () => void }) {
  const t = useT();
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : undefined;
  return (
    <div className="surface-panel flex flex-col items-center px-6 py-12 text-center" role="alert">
      <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="size-6" />
      </div>
      <h3 className="text-base font-medium">{t.common.error}</h3>
      {message && <p className="mt-1 max-w-md break-words text-xs text-muted-foreground" dir="ltr">{message}</p>}
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
          {t.common.retry}
        </Button>
      )}
    </div>
  );
}

export function ForbiddenState() {
  const t = useT();
  return (
    <div className="surface-panel flex flex-col items-center px-6 py-16 text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-warning/15 text-warning-foreground">
        <Lock className="size-6" />
      </div>
      <h3 className="text-base font-medium">{t.common.forbidden}</h3>
    </div>
  );
}

export function UpcomingModule({ title, tables }: { title: string; tables: string[] }) {
  const t = useT();
  return (
    <div>
      <PageHeader title={title} />
      <div className="surface-panel flex flex-col items-center px-6 py-16 text-center">
        <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-brass/15 text-brass-foreground">
          <Construction className="size-7" />
        </div>
        <Badge variant="outline" className="mb-3 border-brass text-brass-foreground">
          {t.common.upcoming}
        </Badge>
        <h3 className="text-lg font-medium">{t.common.upcomingTitle}</h3>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">{t.common.upcomingBody}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2" dir="ltr">
          {tables.map((tbl) => (
            <code key={tbl} className="rounded bg-muted px-2 py-1 text-xs text-muted-foreground">
              {tbl}
            </code>
          ))}
        </div>
      </div>
    </div>
  );
}

export function DemoBadge() {
  const t = useT();
  return (
    <Badge variant="outline" className="border-brass/60 bg-brass/10 text-[10px] font-semibold text-brass-foreground">
      {t.common.demo}
    </Badge>
  );
}

export function StatusBadge({ label, tone }: { label: string | undefined; tone: "success" | "warning" | "info" | "muted" | "destructive" | undefined }) {
  const cls = {
    success: "bg-success/12 text-success border-success/30",
    warning: "bg-warning/15 text-warning-foreground border-warning/40",
    info: "bg-info/12 text-info border-info/30",
    muted: "bg-muted text-muted-foreground border-border",
    destructive: "bg-destructive/10 text-destructive border-destructive/30",
  }[tone ?? "muted"];
  return <Badge variant="outline" className={cls}>{label ?? "—"}</Badge>;
}