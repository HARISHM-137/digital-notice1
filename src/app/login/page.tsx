"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [formData, setFormData] = useState({ email: "", password: "" });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [selectedRole, setSelectedRole] = useState<string>(
        searchParams.get("role") || ""
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            console.log("🔐 Starting login for:", formData.email);

            // Sign in with Supabase Auth
            const { data, error: signInError } = await supabase.auth.signInWithPassword({
                email: formData.email,
                password: formData.password,
            });

            if (signInError) {
                console.error("❌ Auth error:", signInError);
                setError("Invalid email or password. Please try again.");
                setLoading(false);
                return;
            }

            if (!data.user) {
                console.error("❌ No user data returned");
                setError("Login failed. Please try again.");
                setLoading(false);
                return;
            }

            console.log("✅ Auth successful! User ID:", data.user.id);

            // Fetch user role from users table
            console.log("📋 Fetching user profile from database...");
            const { data: userData, error: userError } = await supabase
                .from("users")
                .select("role, name")
                .eq("id", data.user.id)
                .single();

            if (userError || !userData) {
                console.error("❌ User profile error:", userError);
                setError("User profile not found. Contact your administrator.");
                await supabase.auth.signOut();
                setLoading(false);
                return;
            }

            console.log("✅ User profile found:", userData);

            // FORCE REDIRECT - No conditions, just go!
            const targetUrl = `/${userData.role.toLowerCase()}`;
            console.log("🚀 FORCING REDIRECT TO:", targetUrl);

            // Use multiple redirect methods to ensure it works
            setTimeout(() => {
                window.location.href = targetUrl;
            }, 100);

        } catch (err) {
            console.error("Login error:", err);
            setError("An unexpected error occurred. Please try again.");
            setLoading(false);
        }
    };

    const roles = [
        {
            id: "admin",
            label: "Admin",
            desc: "System administrator",
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            ),
        },
        {
            id: "faculty",
            label: "Faculty",
            desc: "Teaching staff",
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
            ),
        },
        {
            id: "student",
            label: "Student",
            desc: "Enrolled student",
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
            ),
        },
    ];

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-secondary-50 px-4">
            <div className="w-full max-w-md">
                {/* Logo and Title */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl mb-4 shadow-lg">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold text-slate-800">CO-PO System</h1>
                    <p className="text-slate-600 mt-1">Sign in to your account</p>
                </div>

                {/* Role Selection */}
                <div className="mb-6">
                    <p className="text-sm font-medium text-slate-700 mb-3">Select your role</p>
                    <div className="grid grid-cols-3 gap-3">
                        {roles.map((role) => (
                            <button
                                key={role.id}
                                type="button"
                                onClick={() => setSelectedRole(role.id)}
                                className={`p-4 rounded-xl border-2 transition-all ${selectedRole === role.id
                                        ? "border-primary-500 bg-primary-50 shadow-md"
                                        : "border-slate-200 bg-white hover:border-primary-200 hover:bg-primary-50/50"
                                    }`}
                            >
                                <div className={`${selectedRole === role.id ? "text-primary-600" : "text-slate-600"} mb-2 flex justify-center`}>
                                    {role.icon}
                                </div>
                                <p className={`text-sm font-semibold ${selectedRole === role.id ? "text-primary-700" : "text-slate-700"}`}>
                                    {role.label}
                                </p>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Login Form */}
                <div className="bg-white rounded-2xl shadow-xl p-8">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                                {error}
                            </div>
                        )}

                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                                Email
                            </label>
                            <input
                                id="email"
                                type="email"
                                required
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                                placeholder="your.email@example.com"
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
                                Password
                            </label>
                            <input
                                id="password"
                                type="password"
                                required
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                                placeholder="••••••••"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                        >
                            {loading ? "Signing in..." : "Sign In"}
                        </button>
                    </form>

                    <p className="text-center text-sm text-slate-600 mt-6">
                        Contact your administrator for account access
                    </p>
                </div>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="text-xl">Loading...</div></div>}>
            <LoginForm />
        </Suspense>
    );
}
