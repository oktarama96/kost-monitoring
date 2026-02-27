import { auth, signOut } from "@/auth";
import { redirect } from "next/navigation";
import { Shield, LogOut } from "lucide-react";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    const session = await auth();
    if (!session || session.user.role !== "superadmin") redirect("/login");

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Admin Navbar — senada dengan owner tapi dengan badge SuperAdmin */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
                <div className="max-w-6xl mx-auto px-4 py-0 flex items-center justify-between h-14">
                    <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-md bg-violet-100 flex items-center justify-center">
                            <Shield size={14} className="text-violet-600" />
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800 text-sm">KostManager</span>
                            <span className="text-xs font-semibold text-violet-600 bg-violet-100 px-2 py-0.5 rounded-full">
                                Admin
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <p className="text-sm font-semibold text-slate-800">{session.user.name}</p>
                            <p className="text-xs text-slate-400">{session.user.email}</p>
                        </div>
                        <form action={async () => {
                            "use server";
                            await signOut({ redirectTo: "/login" });
                        }}>
                            <button
                                type="submit"
                                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-600 transition-colors px-3 py-2 rounded-lg hover:bg-red-50 border border-transparent hover:border-red-200"
                            >
                                <LogOut size={13} /> Keluar
                            </button>
                        </form>
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-4 py-8">
                {children}
            </main>
        </div>
    );
}
