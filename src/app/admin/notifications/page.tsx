"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Department } from "@/lib/types";
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
    creator?: { name: string };
}

export default function AdminNotificationsPage() {
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedNotif, setSelectedNotif] = useState<NotificationItem | null>(null);
    const [filterDept, setFilterDept] = useState("");
    const [filterYear, setFilterYear] = useState("");
    const [filterRole, setFilterRole] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [page, setPage] = useState(0);
    const PAGE_SIZE = 20;

    useEffect(() => {
        fetchNotifications();
        fetchDepartments();
    }, []);

    const fetchNotifications = async () => {
        try {
            const { data, error } = await supabase
                .from("notifications")
                .select("*, departments:department_target(name, code), creator:created_by(name)")
                .order("created_at", { ascending: false });

            if (error) throw error;
            setNotifications(data || []);
        } catch (error) {
            console.error("Error fetching notifications:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchDepartments = async () => {
        try {
            const { data } = await supabase.from("departments").select("*").order("name");
            setDepartments(data || []);
        } catch (error) {
            console.error("Error fetching departments:", error);
        }
    };

    const getTargetLabel = (n: NotificationItem) => {
        const parts: string[] = [];
        if (n.role_target === "FACULTY") parts.push("Faculty");
        else if (n.role_target === "STUDENT") parts.push("Students");
        else parts.push("Everyone");
        if (n.departments) parts.push(n.departments.code);
        if (n.year_target) parts.push(`Year ${n.year_target}`);
        if (n.semester_target) parts.push(`Sem ${n.semester_target}`);
        return parts.join(" · ");
    };

    // Filter notifications
    const filtered = notifications.filter((n) => {
        if (filterDept && n.department_target !== filterDept) return false;
        if (filterYear && n.year_target !== parseInt(filterYear)) return false;
        if (filterRole && n.role_target !== filterRole) return false;
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            return n.title.toLowerCase().includes(q) || n.message?.toLowerCase().includes(q);
        }
        return true;
    });

    // Paginate
    const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
    const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

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
                <h1 className="text-2xl font-bold text-slate-900">All Notifications</h1>
                <p className="text-slate-500">View and manage all system notifications</p>
            </div>

            {/* Filters */}
            <Card>
                <div className="flex flex-wrap gap-4">
                    <div className="flex-1 min-w-[200px]">
                        <input
                            type="text"
                            placeholder="Search notifications..."
                            value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <select
                        value={filterDept}
                        onChange={(e) => { setFilterDept(e.target.value); setPage(0); }}
                        className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="">All Departments</option>
                        {departments.map((d) => (
                            <option key={d.id} value={d.id}>{d.code} - {d.name}</option>
                        ))}
                    </select>
                    <select
                        value={filterYear}
                        onChange={(e) => { setFilterYear(e.target.value); setPage(0); }}
                        className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="">All Years</option>
                        <option value="1">Year 1</option>
                        <option value="2">Year 2</option>
                        <option value="3">Year 3</option>
                        <option value="4">Year 4</option>
                    </select>
                    <select
                        value={filterRole}
                        onChange={(e) => { setFilterRole(e.target.value); setPage(0); }}
                        className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="">All Roles</option>
                        <option value="FACULTY">Faculty</option>
                        <option value="STUDENT">Students</option>
                    </select>
                    <div className="text-sm text-slate-500 self-center">
                        {filtered.length} notification{filtered.length !== 1 ? "s" : ""}
                    </div>
                </div>
            </Card>

            {/* Scrollable List */}
            <div className="overflow-y-auto h-[65vh] space-y-3 pr-1">
                {paginated.length === 0 ? (
                    <Card>
                        <div className="text-center py-12 text-slate-500">
                            <p className="text-lg font-medium">No notifications found</p>
                            <p className="text-sm">Try adjusting your filters</p>
                        </div>
                    </Card>
                ) : (
                    paginated.map((n) => (
                        <Card key={n.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setSelectedNotif(n)}>
                            <div className="flex items-start gap-4">
                                <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center">
                                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                    </svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                        <h3 className="font-semibold text-slate-900">{n.title}</h3>
                                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-violet-100 text-violet-700">{getTargetLabel(n)}</span>
                                        {n.document_url && <span className="px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-700">📎</span>}
                                    </div>
                                    <p className="text-slate-600 text-sm mb-1 line-clamp-1">{n.message}</p>
                                    <div className="flex items-center gap-2 text-xs text-slate-400">
                                        <span>{new Date(n.created_at).toLocaleString()}</span>
                                        {n.creator && <span>by {n.creator.name}</span>}
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ))
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2">
                    <button
                        onClick={() => setPage(Math.max(0, page - 1))}
                        disabled={page === 0}
                        className="px-3 py-1 rounded-lg bg-slate-100 text-slate-700 disabled:opacity-50 hover:bg-slate-200"
                    >
                        ← Prev
                    </button>
                    <span className="text-sm text-slate-500">Page {page + 1} of {totalPages}</span>
                    <button
                        onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                        disabled={page >= totalPages - 1}
                        className="px-3 py-1 rounded-lg bg-slate-100 text-slate-700 disabled:opacity-50 hover:bg-slate-200"
                    >
                        Next →
                    </button>
                </div>
            )}

            {/* Full View Modal */}
            {selectedNotif && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setSelectedNotif(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        <div className="px-6 py-4 bg-gradient-to-r from-violet-600 to-purple-600 text-white">
                            <h2 className="text-xl font-bold">{selectedNotif.title}</h2>
                            <p className="text-white/70 text-sm">{getTargetLabel(selectedNotif)} · {new Date(selectedNotif.created_at).toLocaleString()}</p>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-slate-700 whitespace-pre-wrap">{selectedNotif.message}</p>
                            {selectedNotif.creator && (
                                <p className="text-sm text-slate-500">Posted by: {selectedNotif.creator.name}</p>
                            )}
                            {selectedNotif.document_url && (
                                <a
                                    href={selectedNotif.document_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 text-sm font-medium"
                                >
                                    📎 {selectedNotif.document_name || "Download Attachment"}
                                </a>
                            )}
                            <button
                                onClick={() => setSelectedNotif(null)}
                                className="w-full mt-4 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium"
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
