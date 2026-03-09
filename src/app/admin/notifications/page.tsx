"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Department, NotificationTargetType } from "@/lib/types";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { showToast } from "@/components/ui/Toast";

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

export default function AdminNotificationsPage() {
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [editingNotif, setEditingNotif] = useState<NotificationItem | null>(null);
    const [selectedNotif, setSelectedNotif] = useState<NotificationItem | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [formData, setFormData] = useState({
        title: "",
        message: "",
        target_type: "ALL_STUDENTS" as NotificationTargetType,
        department_id: "",
        year: "",
        semester: "",
    });

    useEffect(() => {
        fetchNotifications();
        fetchDepartments();
    }, []);

    const fetchNotifications = async () => {
        try {
            console.log("[Notifications] Fetching via API...");
            const res = await fetch("/api/notifications");
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            console.log(`[Notifications] Loaded ${data.notifications?.length || 0} notifications`);
            setNotifications(data.notifications || []);
        } catch (error) {
            console.error("[Notifications] Error fetching:", error);
        }
    };

    const fetchDepartments = async () => {
        try {
            const res = await fetch("/api/departments");
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setDepartments(data.departments || []);
        } catch (error) {
            console.error("[Notifications] Error fetching departments:", error);
        }
    };

    const resetForm = () => {
        setFormData({ title: "", message: "", target_type: "ALL_STUDENTS", department_id: "", year: "", semester: "" });
        setSelectedFile(null);
        setEditingNotif(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            // If editing, just update title and message
            if (editingNotif) {
                console.log("[Notifications] Updating notification:", editingNotif.id);
                const res = await fetch("/api/notifications", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        id: editingNotif.id,
                        title: formData.title,
                        message: formData.message,
                    }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);
                showToast("Notification updated successfully!", "success");
                resetForm();
                setShowModal(false);
                fetchNotifications();
                return;
            }

            // Creating new notification
            let documentUrl: string | null = null;
            let documentName: string | null = null;

            if (selectedFile) {
                const uploadForm = new FormData();
                uploadForm.append("file", selectedFile);
                const uploadRes = await fetch("/api/upload", {
                    method: "POST",
                    body: uploadForm,
                });
                const uploadJson = await uploadRes.json();
                if (!uploadRes.ok || uploadJson.error) {
                    showToast("File upload failed: " + (uploadJson.error || "Unknown error"), "error");
                    setIsSubmitting(false);
                    return;
                }
                documentUrl = uploadJson.url;
                documentName = uploadJson.name;
            }

            let roleTarget: string;
            let deptTarget: string | null = null;
            let yearTarget: number | null = null;
            let semesterTarget: number | null = null;

            switch (formData.target_type) {
                case "ALL_STUDENTS": roleTarget = "STUDENT"; break;
                case "ALL_FACULTY": roleTarget = "FACULTY"; break;
                case "ALL_ADMINS": roleTarget = "ADMIN"; break;
                case "DEPARTMENT":
                    roleTarget = "ALL";
                    deptTarget = formData.department_id || null;
                    break;
                case "YEAR":
                    roleTarget = "STUDENT";
                    yearTarget = formData.year ? parseInt(formData.year) : null;
                    break;
                case "SEMESTER":
                    roleTarget = "STUDENT";
                    semesterTarget = formData.semester ? parseInt(formData.semester) : null;
                    break;
                case "DEPARTMENT_YEAR":
                    roleTarget = "STUDENT";
                    deptTarget = formData.department_id || null;
                    yearTarget = formData.year ? parseInt(formData.year) : null;
                    break;
                case "DEPARTMENT_SEMESTER":
                    roleTarget = "STUDENT";
                    deptTarget = formData.department_id || null;
                    semesterTarget = formData.semester ? parseInt(formData.semester) : null;
                    break;
                default: roleTarget = "STUDENT";
            }

            const { data: userData } = await supabase.auth.getUser();

            console.log("[Notifications] Creating notification:", formData.title);
            const res = await fetch("/api/notifications", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: formData.title,
                    message: formData.message,
                    role_target: roleTarget,
                    department_target: deptTarget,
                    year_target: yearTarget,
                    semester_target: semesterTarget,
                    document_url: documentUrl,
                    document_name: documentName,
                    created_by: userData?.user?.id || null,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            showToast("Notification published successfully!", "success");
            resetForm();
            setShowModal(false);
            fetchNotifications();
        } catch (error: any) {
            console.error("[Notifications] Error:", error);
            showToast(error?.message || "Error posting notification", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEdit = (n: NotificationItem) => {
        setEditingNotif(n);
        setFormData({
            ...formData,
            title: n.title,
            message: n.message,
        });
        setShowModal(true);
    };

    const handleDelete = async (id: string) => {
        if (confirm("Are you sure you want to delete this notification?")) {
            try {
                console.log("[Notifications] Deleting:", id);
                const res = await fetch(`/api/notifications?id=${id}`, { method: "DELETE" });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);
                showToast("Notification deleted", "success");
                fetchNotifications();
            } catch (error: any) {
                console.error("[Notifications] Delete error:", error);
                showToast(error?.message || "Error deleting notification", "error");
            }
        }
    };

    const showsDepartment = ["DEPARTMENT", "DEPARTMENT_YEAR", "DEPARTMENT_SEMESTER"].includes(formData.target_type);
    const showsYear = ["YEAR", "DEPARTMENT_YEAR"].includes(formData.target_type);
    const showsSemester = ["SEMESTER", "DEPARTMENT_SEMESTER"].includes(formData.target_type);

    const getTargetLabel = (n: NotificationItem) => {
        const parts: string[] = [];
        if (n.role_target === "FACULTY") parts.push("Faculty");
        else if (n.role_target === "STUDENT") parts.push("Students");
        else if (n.role_target === "ADMIN") parts.push("Admins");
        else parts.push("Everyone");
        if (n.departments) parts.push(n.departments.code);
        if (n.year_target) parts.push(`Year ${n.year_target}`);
        if (n.semester_target) parts.push(`Sem ${n.semester_target}`);
        return parts.join(" · ");
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Notifications & Announcements</h1>
                    <p className="text-slate-500">Publish targeted notifications to students and faculty</p>
                </div>
                <Button onClick={() => { resetForm(); setShowModal(true); }}>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                    </svg>
                    New Announcement
                </Button>
            </div>

            {/* Notifications Table */}
            <Card>
                {notifications.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                        <svg className="w-16 h-16 mx-auto mb-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                        <p className="text-lg font-medium">No announcements yet</p>
                        <p className="text-sm">Post your first announcement</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">Title</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">Message</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">Target</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">Date</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {notifications.map((n) => (
                                    <tr key={n.id} className="border-b border-slate-100 hover:bg-slate-50">
                                        <td className="px-6 py-4">
                                            <span className="font-semibold text-slate-900">{n.title}</span>
                                            {n.document_url && (
                                                <span className="ml-2 px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-700">📎</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 text-sm max-w-xs truncate">{n.message}</td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-indigo-100 text-indigo-700">
                                                {getTargetLabel(n)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-500 text-sm">{new Date(n.created_at).toLocaleDateString()}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex gap-2">
                                                <button onClick={() => setSelectedNotif(n)} className="text-slate-600 hover:text-slate-800 font-medium text-sm">View</button>
                                                <button onClick={() => handleEdit(n)} className="text-indigo-600 hover:text-indigo-800 font-medium text-sm">Edit</button>
                                                <button onClick={() => handleDelete(n.id)} className="text-red-600 hover:text-red-800 font-medium text-sm">Delete</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {/* View Notification Modal */}
            {selectedNotif && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setSelectedNotif(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        <div className="px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                            <h2 className="text-xl font-bold">{selectedNotif.title}</h2>
                            <p className="text-white/70 text-sm">{getTargetLabel(selectedNotif)} · {new Date(selectedNotif.created_at).toLocaleString()}</p>
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
                            <div className="pt-4">
                                <Button variant="secondary" onClick={() => setSelectedNotif(null)} className="w-full">Close</Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Post / Edit Announcement Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden max-h-[90vh] overflow-y-auto">
                        <div className="px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                            <h2 className="text-xl font-bold">{editingNotif ? "Edit Announcement" : "New Announcement"}</h2>
                            <p className="text-white/80 text-sm">{editingNotif ? "Update notification details" : "Target specific groups with your notification"}</p>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    placeholder="e.g., Assignment Deadline Extended"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Message *</label>
                                <textarea
                                    required
                                    value={formData.message}
                                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    rows={4}
                                    placeholder="Write your announcement..."
                                />
                            </div>
                            {!editingNotif && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Target Audience *</label>
                                        <select
                                            required
                                            value={formData.target_type}
                                            onChange={(e) => setFormData({ ...formData, target_type: e.target.value as NotificationTargetType })}
                                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        >
                                            <option value="ALL_STUDENTS">All Students</option>
                                            <option value="ALL_FACULTY">All Faculty</option>
                                            <option value="ALL_ADMINS">All Admins</option>
                                            <option value="DEPARTMENT">Department Only</option>
                                            <option value="YEAR">Year Only</option>
                                            <option value="SEMESTER">Semester Only</option>
                                            <option value="DEPARTMENT_YEAR">Department + Year</option>
                                            <option value="DEPARTMENT_SEMESTER">Department + Semester</option>
                                        </select>
                                    </div>
                                    {showsDepartment && (
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Department *</label>
                                            <select required value={formData.department_id} onChange={(e) => setFormData({ ...formData, department_id: e.target.value })} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500">
                                                <option value="">Select department</option>
                                                {departments.map((d) => (
                                                    <option key={d.id} value={d.id}>{d.code} - {d.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                    {showsYear && (
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Year *</label>
                                            <select required value={formData.year} onChange={(e) => setFormData({ ...formData, year: e.target.value })} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500">
                                                <option value="">Select year</option>
                                                <option value="1">1st Year</option>
                                                <option value="2">2nd Year</option>
                                                <option value="3">3rd Year</option>
                                                <option value="4">4th Year</option>
                                            </select>
                                        </div>
                                    )}
                                    {showsSemester && (
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Semester *</label>
                                            <select required value={formData.semester} onChange={(e) => setFormData({ ...formData, semester: e.target.value })} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500">
                                                <option value="">Select semester</option>
                                                {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                                                    <option key={s} value={s}>Semester {s}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Attach Document (Optional)</label>
                                        <input
                                            type="file"
                                            accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,.txt,.jpg,.jpeg,.png"
                                            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                                            className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                                        />
                                    </div>
                                </>
                            )}
                            <div className="flex gap-3 pt-4">
                                <Button type="button" variant="secondary" onClick={() => { resetForm(); setShowModal(false); }} className="flex-1">Cancel</Button>
                                <Button type="submit" disabled={isSubmitting} className="flex-1">
                                    {isSubmitting ? "Saving..." : editingNotif ? "Update" : "Publish"}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
