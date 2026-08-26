"use client";

import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import {
  Archive,
  BarChart3,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FolderKanban,
  Home,
  Inbox,
  LayoutDashboard,
  ListChecks,
  ListTodo,
  Menu,
  Settings,
  Users,
  X,
} from "lucide-react";
import { QuickAddTask } from "@/components/quick-add-task";
import { GlobalSearch } from "@/components/global-search";
import { NotificationBell } from "@/components/notification-bell";

type ShellNotification = {
  id: string;
  taskId: string | null;
  title: string;
  body: string | null;
  createdAt: Date;
};

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  count?: number;
};

export function ShellClient({
  active,
  children,
  currentUser,
  shellData,
}: {
  active: string;
  children: React.ReactNode;
  currentUser: { id: string; name: string; role: string };
  shellData: { unread: ShellNotification[]; unreadCount: number; myWorkCount: number; overdueCount: number };
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(window.localStorage.getItem("ayna-sidebar-collapsed") === "true");
  }, []);

  function toggleCollapsed() {
    setCollapsed((value) => {
      const next = !value;
      window.localStorage.setItem("ayna-sidebar-collapsed", String(next));
      return next;
    });
  }

  const primary: NavItem[] = [
    { label: "Home", href: "/", icon: Home },
    { label: "My Work", href: "/my-work", icon: ListChecks, count: shellData.overdueCount || shellData.myWorkCount },
    { label: "Inbox", href: "/inbox", icon: Inbox, count: shellData.unreadCount },
  ];
  const planning: NavItem[] = [
    { label: "All Tasks", href: "/tasks", icon: ListTodo },
    { label: "Projects", href: "/projects", icon: FolderKanban },
    { label: "Board", href: "/board", icon: LayoutDashboard },
    { label: "Calendar", href: "/calendar", icon: CalendarDays },
  ];
  const insight: NavItem[] = [
    { label: "Team", href: "/team", icon: Users },
    { label: "Analytics", href: "/analytics", icon: BarChart3 },
    { label: "Archive", href: "/archive", icon: Archive },
    { label: "Settings", href: "/settings", icon: Settings },
  ];

  const sidebar = (
    <aside className={`${collapsed ? "w-[76px]" : "w-60"} h-full bg-surface border-r border-border flex flex-col transition-[width] duration-200`}>
      <div className="h-16 flex items-center justify-between px-4 border-b border-border/70">
        <Link href="/" onClick={() => setMobileOpen(false)} className="font-voice text-[22px] font-semibold text-accent-text leading-none">
          {collapsed ? "a" : "ayna"}
        </Link>
        <button onClick={toggleCollapsed} className="hidden md:flex p-1.5 rounded-lg hover:bg-surface-sunk text-text-muted" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
          {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
        </button>
        <button onClick={() => setMobileOpen(false)} className="md:hidden p-1.5 rounded-lg hover:bg-surface-sunk" aria-label="Close menu"><X size={17} /></button>
      </div>

      <div className="flex-1 overflow-y-auto px-2.5 py-4">
        <NavGroup items={primary} active={active} collapsed={collapsed} onNavigate={() => setMobileOpen(false)} />
        {!collapsed && <div className="px-2.5 pt-5 pb-1.5 text-[10px] uppercase tracking-[0.13em] font-semibold text-text-muted">Plan</div>}
        {collapsed && <div className="h-3" />}
        <NavGroup items={planning} active={active} collapsed={collapsed} onNavigate={() => setMobileOpen(false)} />
        {!collapsed && <div className="px-2.5 pt-5 pb-1.5 text-[10px] uppercase tracking-[0.13em] font-semibold text-text-muted">Workspace</div>}
        {collapsed && <div className="h-3" />}
        <NavGroup items={insight} active={active} collapsed={collapsed} onNavigate={() => setMobileOpen(false)} />
      </div>

      <div className="p-3 border-t border-border">
        <div className={`flex items-center ${collapsed ? "justify-center" : "gap-2.5"}`}>
          <UserButton afterSignOutUrl="/sign-in" />
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{currentUser.name}</div>
              <div className="text-[11px] text-text-muted capitalize">{currentUser.role}</div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-page flex">
      <div className="hidden md:block h-screen sticky top-0">{sidebar}</div>
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-text-primary/25" onClick={() => setMobileOpen(false)} />
          <div className="relative w-72 h-full">{sidebar}</div>
        </div>
      )}

      <div className="min-w-0 flex-1">
        <header className="h-16 sticky top-0 z-30 bg-page/90 backdrop-blur-md border-b border-border/60 flex items-center gap-3 px-4 sm:px-6 lg:px-8">
          <button onClick={() => setMobileOpen(true)} className="md:hidden p-2 rounded-xl hover:bg-surface" aria-label="Open menu"><Menu size={19} /></button>
          <div className="flex-1 flex justify-center sm:justify-start"><GlobalSearch /></div>
          <NotificationBell items={shellData.unread} count={shellData.unreadCount} />
          <QuickAddTask />
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="max-w-[1500px] mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}

function NavGroup({ items, active, collapsed, onNavigate }: { items: NavItem[]; active: string; collapsed: boolean; onNavigate: () => void }) {
  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const selected = active === item.label;
        return (
          <Link
            key={item.label}
            href={item.href}
            onClick={onNavigate}
            title={collapsed ? item.label : undefined}
            className={`group flex items-center ${collapsed ? "justify-center px-2" : "gap-2.5 px-2.5"} min-h-9 rounded-xl text-sm transition-colors ${
              selected ? "bg-accent-soft text-accent-text font-semibold" : "text-text-secondary hover:bg-surface-sunk/70 hover:text-text-primary"
            }`}
          >
            <item.icon size={16} className="shrink-0" />
            {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
            {!collapsed && item.count ? (
              <span className={`text-[10px] min-w-5 h-5 px-1 rounded-full flex items-center justify-center ${selected ? "bg-surface text-accent-text" : "bg-surface-sunk text-text-muted"}`}>
                {item.count > 99 ? "99+" : item.count}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
