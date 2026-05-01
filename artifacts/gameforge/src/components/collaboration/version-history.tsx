import { ProjectVersions } from "@/components/workspace/project-versions";

interface VersionHistoryProps {
  projectId: number;
}

export function VersionHistory({ projectId }: VersionHistoryProps) {
  return <ProjectVersions projectId={projectId} />;
}
