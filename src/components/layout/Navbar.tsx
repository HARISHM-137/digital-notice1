"use client";

import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

interface NavbarProps {
    userName: string;
    userRole: string;
}

export default function Navbar({ userName, userRole }: NavbarProps) {
    const router = useRouter();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/login");
    };

    return (
        <header className="fixed top-0 left-64 right-0 h-16 bg-white shadow-sm z-40 flex items-center justify-between px-6">
            {/* Breadcrumb / Title */}
            <div className="flex items-center gap-4">
                <h2 className="text-lg font-semibold text-slate-800">Dashboard</h2>
            </div>

            {/* Right section */}
            <div className="flex items-center gap-4">
                {/* Notifications */}
                <button
                    onClick={() => router.push(`/${userRole}/notifications`)}
                    className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                    title="Notifications"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                        />
                    </svg>
                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                </button>

                {/* User Profile */}
                <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
                    <div className="text-right">
                        <p className="text-sm font-medium text-slate-700">{userName}</p>
                        <p className="text-xs text-slate-500 capitalize">{userRole}</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-semibold">
                        {userName.charAt(0).toUpperCase()}
                    </div>
                </div>

                {/* Logout */}
                <button
                    onClick={handleLogout}
                    className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Sign Out"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                </button>
            </div>
        </header>
    );
}
