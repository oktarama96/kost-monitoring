import Navbar from "@/components/Navbar";

// Layout untuk semua halaman pengelola kost
export default function OwnerLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            {/* Offset for desktop sidebar (w-60) */}
            <main className="lg:pl-60">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
                    {children}
                </div>
            </main>
        </div>
    );
}
