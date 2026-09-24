import { Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useT } from "@/lib/i18n";
import { P } from "@/lib/permissions";
import { cn } from "@/lib/utils";

export function AdminTabs() {
  const t = useT();
  const { canAny } = useAuth();
  const tabs = [
    { to: "/admin/users", label: t.admin.users, anyOf: [P.usersRead] },
    { to: "/admin/roles", label: t.admin.roles, anyOf: [P.rolesRead] },
    { to: "/admin/units", label: t.admin.units, anyOf: [P.unitsRead] },
    { to: "/admin/audit", label: t.admin.audit, anyOf: [P.auditRead] },
  ] as const;
  return (
    <div className="mb-6 flex flex-wrap gap-1 border-b">
      {tabs.filter((tab) => canAny([...tab.anyOf])).map((tab) => (
        <Link
          key={tab.to}
          to={tab.to}
          className={cn("-mb-px border-b-2 border-transparent px-4 py-2 text-sm text-muted-foreground hover:text-foreground")}
          activeProps={{ className: "border-brass text-foreground font-medium" }}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}