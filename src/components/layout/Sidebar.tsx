"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface MenuItem {
    label: string;
    href: string;
    icon: React.ReactNode;
}

interface SidebarProps {
    menuItems: MenuItem[];
    title: string;
    role: "admin" | "faculty" | "student";
}

const roleColors = {
    admin: "from-primary-800 to-primary-900",
    faculty: "from-secondary-700 to-secondary-800",
    student: "from-slate-700 to-slate-800",
};

export default function Sidebar({ menuItems, title, role }: SidebarProps) {
    const pathname = usePathname();

    return (
        <aside
            className={`fixed left-0 top-0 h-full w-64 bg-gradient-to-b ${roleColors[role]} shadow-xl z-50`}
        >
            {/* Logo/Title */}
            <div className="px-6 py-6 border-b border-white/10">
                <h1 className="text-xl font-bold text-white">{title}</h1>
                <span className="text-xs text-white/60 uppercase tracking-wider">
                    {role} Portal
                </span>
            </div>

            {/* Navigation */}
            <nav className="px-4 py-6 space-y-2 overflow-y-auto" style={{ maxHeight: "calc(100vh - 160px)" }}>
                {menuItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`sidebar-link ${isActive ? "active" : ""}`}
                        >
                            <span className="w-5 h-5">{item.icon}</span>
                            <span>{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* Footer */}
            <div className="absolute bottom-0 left-0 right-0 px-6 py-4 border-t border-white/10">
                <Link
                    href="/"
                    className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
                >
                    <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                        />
                    </svg>
                    <span>Logout</span>
                </Link>
            </div>
        </aside>
    );
}
