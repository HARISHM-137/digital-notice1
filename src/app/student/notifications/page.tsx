"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import Card from "@/components/ui/Card";

interface NotificationItem {
    id: string;
    title: string;
    message: string;
    document_url?: string;
    document_name?: string;
    role_target: string;
    department_target?: string;
    year_target?: number;
    semester_target?: number;
    created_at: string;
    departments?: { name: string; code: string };
}

export default function StudentNotificationsPage() {
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedNotif, setSelectedNotif] = useState<NotificationItem | null>(null);

    useEffect(() => {
        fetchNotifications();
    }, []);

    const fetchNotifications = async () => {
        try {
            // Get current user info
            const { data: userData } = await supabase.auth.getUser();
            let userDept: string | null = null;
            let userYear: number | null = null;
            let userSemesters: number[] = [];

            if (userData?.user?.id) {
                const { data: profile } = await supabase
                    .from("users")
                    .select("department_id, year")
                    .eq("id", userData.user.id)
                    .single();

                if (profile) {
                    userDept = profile.department_id;
                    userYear = profile.year;
                    // Year → semester mapping
                    if (userYear === 1) userSemesters = [1, 2];
                    else if (userYear === 2) userSemesters = [3, 4];
                    else if (userYear === 3) userSemesters = [5, 6];
                    else if (userYear === 4) userSemesters = [7, 8];
                }
            }

            // Fetch all notifications targeted at students or all
            const { data, error } = await supabase
                .from("notifications")
                .select("*, departments:department_target(name, code)")
                .in("role_target", ["STUDENT", "ALL"])
                .order("created_at", { ascending: false });

            if (error) throw error;

            // Client-side filter for targeted notifications
            const filtered = (data || []).filter((n: NotificationItem) => {
                // Department filter: null means all departments
                if (n.department_target && userDept && n.department_target !== userDept) return false;
                // Year filter: null means all years
                if (n.year_target && userYear && n.year_target !== userYear) return false;
                // Semester filter: null means all semesters
                if (n.semester_target && userSemesters.length > 0 && !userSemesters.includes(n.semester_target)) return false;
                return true;
            });

            setNotifications(filtered);
        } catch (error) {
            console.error("Error fetching notifications:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
                <p className="text-slate-500">Announcements and updates relevant to you</p>
            </div>

            <div className="overflow-y-auto max-h-[80vh] space-y-3 pr-1">
                {notifications.length === 0 ? (
                    <Card>
                        <div className="text-center py-12 text-slate-500">
                            <svg className="w-16 h-16 mx-auto mb-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                            </svg>
                            <p className="text-lg font-medium">No notifications</p>
                            <p className="text-sm">Check back later for updates</p>
                        </div>
                    </Card>
                ) : (
                    notifications.map((n) => (
                        <Card key={n.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setSelectedNotif(n)}>
                            <div className="flex items-start gap-4">
                                <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                                    {n.document_url ? (
                                        <span className="text-white text-lg">📎</span>
                                    ) : (
                                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                        </svg>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-slate-900 mb-1">{n.title}</h3>
                                    <p className="text-slate-600 text-sm mb-2 line-clamp-2">{n.message}</p>
                                    <div className="flex items-center gap-2">
                                        <p className="text-xs text-slate-400">{new Date(n.created_at).toLocaleString()}</p>
                                        {n.departments && (
                                            <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">{n.departments.code}</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ))
                )}
            </div>

            {/* Full View Modal */}
            {selectedNotif && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setSelectedNotif(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        <div className="px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white">
                            <h2 className="text-xl font-bold">{selectedNotif.title}</h2>
                            <p className="text-white/70 text-sm">{new Date(selectedNotif.created_at).toLocaleString()}</p>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-slate-700 whitespace-pre-wrap">{selectedNotif.message}</p>
                            {selectedNotif.document_url && (
                                <a
                                    href={selectedNotif.document_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors text-sm font-medium"
                                >
                                    📎 {selectedNotif.document_name || "Download Attachment"}
                                </a>
                            )}
                            <button
                                onClick={() => setSelectedNotif(null)}
                                className="w-full mt-4 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
