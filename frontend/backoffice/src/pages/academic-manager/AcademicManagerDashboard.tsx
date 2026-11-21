import { AcademicManagerView } from "@teky/shared/ui/AcademicManagerView";
interface AcademicManagerDashboardProps {
  activeNavId?: string;
  onSelectNav?: (id: string) => void;
}
export function AcademicManagerDashboard(props: AcademicManagerDashboardProps) {
  return <AcademicManagerView key={props.activeNavId} {...props} />;
}
