import { getActiveUsers, getShellData } from "@/lib/queries";
import { ShellClient } from "@/components/shell-client";

export async function AppShell({
  active,
  children,
  currentUser,
}: {
  active: string;
  children: React.ReactNode;
  currentUser: { id: string; name: string; role: string };
}) {
  const [shellData, people] = await Promise.all([
    getShellData(currentUser.id),
    getActiveUsers(),
  ]);

  return (
    <ShellClient
      active={active}
      currentUser={{ id: currentUser.id, name: currentUser.name, role: currentUser.role }}
      people={people.map((person) => ({ id: person.id, name: person.name }))}
      shellData={shellData}
    >
      {children}
    </ShellClient>
  );
}
