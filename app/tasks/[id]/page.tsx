import { getOrCreateCurrentUser } from "@/lib/auth";
import { getTaskDetail } from "@/lib/queries";
import { AppShell } from "@/components/app-shell";
import { TaskDetailPanel } from "@/components/task-detail-panel";
import { notFound } from "next/navigation";

export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getOrCreateCurrentUser();
  if (!user) return null;
  const task = await getTaskDetail(id);
  if (!task) notFound();

  return (
    <AppShell active="All Tasks" currentUserName={user.name}>
      <TaskDetailPanel task={task} currentUser={user} />
    </AppShell>
  );
}
