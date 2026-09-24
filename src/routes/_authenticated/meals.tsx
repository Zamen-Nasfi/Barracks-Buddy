import { createFileRoute } from "@tanstack/react-router";
import { UpcomingModule } from "@/components/common/States";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/meals")({
  component: Page,
});

function Page() {
  const t = useT();
  return <UpcomingModule title={t.nav.meals} tables={["meal_plans", "meal_consumption"]} />;
}