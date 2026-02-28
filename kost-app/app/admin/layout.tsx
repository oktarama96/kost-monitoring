import { auth, signOut } from "@/auth";
import { redirect } from "next/navigation";
import { Shield, LogOut, Building2 } from "lucide-react";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    const session = await auth();
    if (!session || session.user.role !== "superadmin") redirect("/login");

    return (
        <div className="min-h-screen bg-background">
            {/* Admin header */}
            <header className="bg-sidebar border-b border-sidebar-border sticky top-0 z-40">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
                    {/* Brand */}
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-sm">
                            <Building2 size={15} className="text-primary-foreground" />
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-sidebar-foreground text-sm tracking-tight">
                                KostManager
                            </span>
                            <span className="flex items-center gap-1 text-xs font-semibold text-violet-300 bg-violet-500/20 px-2 py-0.5 rounded-full border border-violet-500/30">
                                <Shield size={10} />
                                Admin
                            </span>
                        </div>
                    </div>

                    {/* User + logout */}
                    <div className="flex items-center gap-4">
                        <div className="text-right hidden sm:block">
                            <p className="text-sm font-semibold text-sidebar-foreground leading-tight">
                                {session.user.name}
                            </p>
                            <p className="text-xs text-sidebar-foreground/50">
                                {session.user.email}
                            </p>
                        </div>
                        <form
                            action={async () => {
                                "use server";
                                await signOut({ redirectTo: "/login" });
                            }}
                        >
                            <button
                                type="submit"
                                className="flex items-center gap-1.5 text-xs text-sidebar-foreground/60 hover:text-red-400 transition-colors px-3 py-2 rounded-lg hover:bg-red-500/10 border border-transparent hover:border-red-500/20"
                            >
                                <LogOut size={13} />
                                <span className="hidden sm:inline">Keluar</span>
                            </button>
                        </form>
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
                {children}
            </main>
        </div>
    );
}
