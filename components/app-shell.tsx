import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import {
  Home, ListChecks, ListTodo, FolderKanban, Users as UsersIcon, Plus,
} from "lucide-react";
import { QuickAddTask } from "@/components/quick-add-task";

const navItems = [
  { label: "Home", href: "/", icon: Home },
  { label: "My Work", href: "/my-work", icon: ListChecks },
  { label: "All Tasks", href: "/tasks", icon: ListTodo },
  { label: "Projects", href: "/projects", icon: FolderKanban },
  { label: "Team", href: "/team", icon: UsersIcon },
];

export function AppShell({
  active,
  children,
  currentUserName,
}: {
  active: string;
  children: React.ReactNode;
  currentUserName: string;
}) {
  return (
    <div className="flex min-h-screen bg-page">
      <aside className="w-56 shrink-0 border-r border-border bg-surface flex flex-col p-3">
        <div className="px-2 mb-6">
          <span className="font-voice text-xl font-semibold text-accent-text">ayna</span>
        </div>
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive = active === item.label;
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm ${
                  isActive ? "bg-accent-soft text-accent-text font-medium" : "text-text-secondary hover:bg-surface-sunk"
                }`}
              >
                <item.icon size={16} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto flex items-center gap-2.5 pt-3 border-t border-border">
          <UserButton afterSignOutUrl="/sign-in" />
          <span className="text-sm font-medium">{currentUserName}</span>
        </div>
      </aside>
      <main className="flex-1 overflow-auto px-9 py-7">
        <div className="flex items-center justify-between mb-6">
          <div />
          <QuickAddTask />
        </div>
        {children}
      </main>
    </div>
  );
}
