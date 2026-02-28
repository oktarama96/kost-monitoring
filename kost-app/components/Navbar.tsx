"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  BedDouble,
  FileInput,
  ClipboardList,
  Building2,
  LogOut,
  ChevronDown,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/rooms", label: "Kelola Kamar", icon: BedDouble },
  { href: "/billing", label: "Input Tagihan", icon: FileInput },
  { href: "/billing-list", label: "Daftar Tagihan", icon: ClipboardList },
];

export default function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const initials = session?.user?.name
    ? session.user.name
        .split(" ")
        .slice(0, 2)
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "U";

  return (
    <>
      {/* ── Desktop Sidebar ── */}
      <aside className="hidden lg:flex flex-col w-60 min-h-screen bg-sidebar border-r border-sidebar-border fixed left-0 top-0 z-40">
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 h-16 border-b border-sidebar-border shrink-0">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-sm">
            <Building2 className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-base font-bold text-sidebar-foreground tracking-tight">
            KostManager
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto scrollbar-thin">
          <p className="text-xs font-semibold text-sidebar-foreground/40 uppercase tracking-widest px-3 mb-3">
            Menu
          </p>
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <Icon size={16} className="shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        {session?.user && (
          <div className="px-3 py-4 border-t border-sidebar-border shrink-0">
            <div className="relative">
              <button
                onClick={() => setDropdownOpen((v) => !v)}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-150"
              >
                <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold shrink-0">
                  {initials}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-semibold text-sidebar-foreground truncate">
                    {session.user.name}
                  </p>
                  <p className="text-xs text-sidebar-foreground/50 truncate">
                    {session.user.email}
                  </p>
                </div>
                <ChevronDown
                  size={14}
                  className={cn(
                    "shrink-0 transition-transform duration-200",
                    dropdownOpen && "rotate-180"
                  )}
                />
              </button>

              {dropdownOpen && (
                <div className="absolute bottom-full left-0 right-0 mb-1 bg-popover border border-border rounded-xl shadow-lg py-1 z-50">
                  <button
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors rounded-lg mx-0"
                  >
                    <LogOut size={14} />
                    Keluar
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </aside>

      {/* ── Mobile Top Bar ── */}
      <header className="lg:hidden sticky top-0 z-40 bg-sidebar border-b border-sidebar-border">
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <Building2 className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="text-sm font-bold text-sidebar-foreground">KostManager</span>
          </div>
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="p-2 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent transition-colors"
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {/* Mobile Nav Drawer */}
        {mobileOpen && (
          <div className="border-t border-sidebar-border bg-sidebar px-3 py-3 space-y-0.5">
            {navItems.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <Icon size={16} />
                  {label}
                </Link>
              );
            })}
            {session?.user && (
              <div className="pt-2 mt-2 border-t border-sidebar-border">
                <div className="flex items-center gap-3 px-3 py-2 mb-1">
                  <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-sidebar-foreground truncate">
                      {session.user.name}
                    </p>
                    <p className="text-xs text-sidebar-foreground/50 truncate">
                      {session.user.email}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                >
                  <LogOut size={14} />
                  Keluar
                </button>
              </div>
            )}
          </div>
        )}
      </header>
    </>
  );
}
