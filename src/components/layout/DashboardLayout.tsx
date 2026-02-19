import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

interface MenuItem {
    label: string;
    href: string;
    icon: React.ReactNode;
}

interface DashboardLayoutProps {
    children: React.ReactNode;
    menuItems: MenuItem[];
    title: string;
    role: "admin" | "faculty" | "student";
    userName: string;
}

export default function DashboardLayout({
    children,
    menuItems,
    title,
    role,
    userName,
}: DashboardLayoutProps) {
    return (
        <div className="min-h-screen bg-slate-50">
            <Sidebar menuItems={menuItems} title={title} role={role} />
            <Navbar userName={userName} userRole={role} />
            <main className="ml-64 pt-16 p-6">
                <div className="animate-fade-in">{children}</div>
            </main>
        </div>
    );
}
