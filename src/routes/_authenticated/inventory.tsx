import { createFileRoute } from "@tanstack/react-router";
import { UpcomingModule } from "@/components/common/States";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/inventory")({
  component: Page,
});

function Page() {
  const t = useT();
  return <UpcomingModule title={t.nav.inventory} tables={["inventory_items", "inventory_transactions"]} />;
}