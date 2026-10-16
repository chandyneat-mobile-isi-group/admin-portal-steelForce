import { PlanningProvider, PlanningNav, StopDetailDrawer, PlanSummaryDrawer } from '@/features/planning';

/**
 * One provider for the whole module: assignments made on the board are still
 * there when the manager moves to the map or the reports tab.
 */
export default function PlanningLayout({ children }: { children: React.ReactNode }) {
  return (
    <PlanningProvider>
      <PlanningNav />
      {children}
      <StopDetailDrawer />
      <PlanSummaryDrawer />
    </PlanningProvider>
  );
}
