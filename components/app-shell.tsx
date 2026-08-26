import { getShellData } from "@/lib/queries";
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
  const shellData = await getShellData(currentUser.id);

  return (
    <ShellClient
      active={active}
      currentUser={{ id: currentUser.id, name: currentUser.name, role: currentUser.role }}
      shellData={shellData}
    >
      {children}
    </ShellClient>
  );
}
