"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { User, Department } from "@/lib/types";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

export default function AdminUsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [formError, setFormError] = useState("");
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        role: "STUDENT" as "STUDENT" | "FACULTY" | "ADMIN",
        department_id: "",
        year: "" as string,
        semester: "" as string,
    });

    useEffect(() => {
        fetchUsers();
        fetchDepartments();
    }, []);

    const fetchUsers = async () => {
        try {
            const { data, error } = await supabase
                .from("users")
                .select("*")
                .order("created_at", { ascending: false });

            if (error) throw error;
            setUsers(data || []);
        } catch (error) {
            console.error("Error fetching users:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchDepartments = async () => {
        try {
            const { data, error } = await supabase
                .from("departments")
                .select("*")
                .order("name");

            if (error) throw error;
            setDepartments(data || []);
        } catch (error) {
            console.error("Error fetching departments:", error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setFormError("");

        try {
            if (editingUser) {
                // Update existing user profile (not auth)
                const { error } = await supabase
                    .from("users")
                    .update({
                        name: formData.name,
                        role: formData.role,
                        department_id: formData.department_id || null,
                    })
                    .eq("id", editingUser.id);

                if (error) throw error;
            } else {
                // Create new user via API route (handles Auth + DB)
                const res = await fetch("/api/auth/create-user", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        name: formData.name,
                        email: formData.email,
                        password: formData.password,
                        role: formData.role,
                        department_id: formData.department_id || null,
                        year: formData.role === "STUDENT" && formData.year ? parseInt(formData.year) : null,
                    }),
                });

                const result = await res.json();
                if (!res.ok) {
                    setFormError(result.error || "Failed to create user.");
                    setIsSubmitting(false);
                    return;
                }
            }

            setFormData({ name: "", email: "", password: "", role: "STUDENT", department_id: "", year: "", semester: "" });
            setEditingUser(null);
            setShowModal(false);
            fetchUsers();
        } catch (error: any) {
            console.error("Error saving user:", error);
            setFormError(error?.message || "Error saving user. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEdit = (user: User) => {
        setEditingUser(user);
        setFormError("");
        setFormData({
            name: user.name,
            email: user.email,
            password: "",
            role: user.role,
            department_id: user.department_id || "",
            year: user.year ? user.year.toString() : "",
            semester: "",
        });
        setShowModal(true);
    };

    const handleDelete = async (userId: string) => {
        if (confirm("Are you sure you want to delete this user?")) {
            try {
                const { error } = await supabase.from("users").delete().eq("id", userId);
                if (error) throw error;
                fetchUsers();
            } catch (error) {
                console.error("Error deleting user:", error);
                alert("Error deleting user. Please try again.");
            }
        }
    };

    const getRoleBadgeColor = (role: string) => {
        switch (role) {
            case "STUDENT":
                return "bg-green-100 text-green-700";
            case "FACULTY":
                return "bg-blue-100 text-blue-700";
            case "ADMIN":
                return "bg-purple-100 text-purple-700";
            default:
                return "bg-slate-100 text-slate-700";
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
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
                    <p className="text-slate-500">Add and manage students, faculty, and admins</p>
                </div>
                <Button onClick={() => { setEditingUser(null); setFormError(""); setFormData({ name: "", email: "", password: "", role: "STUDENT", department_id: "", year: "", semester: "" }); setShowModal(true); }}>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add User
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/20 rounded-lg">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-white/80 text-sm">Students</p>
                            <p className="text-2xl font-bold">{users.filter(u => u.role === "STUDENT").length}</p>
                        </div>
                    </div>
                </Card>
                <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/20 rounded-lg">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-white/80 text-sm">Faculty</p>
                            <p className="text-2xl font-bold">{users.filter(u => u.role === "FACULTY").length}</p>
                        </div>
                    </div>
                </Card>
                <Card className="bg-gradient-to-br from-purple-500 to-pink-600 text-white">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/20 rounded-lg">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-white/80 text-sm">Admins</p>
                            <p className="text-2xl font-bold">{users.filter(u => u.role === "ADMIN").length}</p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Users Table */}
            <Card>
                {users.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                        <svg className="w-16 h-16 mx-auto mb-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        <p className="text-lg font-medium">No users yet</p>
                        <p className="text-sm">Add your first user to get started</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">Name</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">Email</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">Role</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">Joined</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((user) => (
                                    <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50">
                                        <td className="px-6 py-4 text-slate-900 font-medium">{user.name}</td>
                                        <td className="px-6 py-4 text-slate-600">{user.email}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleBadgeColor(user.role)}`}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-500">{new Date(user.created_at).toLocaleDateString()}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleEdit(user)}
                                                    className="text-indigo-600 hover:text-indigo-800 font-medium text-sm"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(user.id)}
                                                    className="text-red-600 hover:text-red-800 font-medium text-sm"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {/* Add/Edit User Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
                        <div className="px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                            <h2 className="text-xl font-bold">{editingUser ? "Edit User" : "Add New User"}</h2>
                            <p className="text-white/80 text-sm">
                                {editingUser ? "Update user information" : "Create a new user account"}
                            </p>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {formError && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                                    {formError}
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    placeholder="e.g., John Doe"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                                <input
                                    type="email"
                                    required
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    placeholder="e.g., john@example.com"
                                    disabled={!!editingUser}
                                />
                            </div>
                            {!editingUser && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Password *</label>
                                    <input
                                        type="password"
                                        required={!editingUser}
                                        minLength={6}
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                        placeholder="Min. 6 characters"
                                    />
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Role *</label>
                                <select
                                    required
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value as "STUDENT" | "FACULTY" | "ADMIN" })}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                >
                                    <option value="STUDENT">Student</option>
                                    <option value="FACULTY">Faculty</option>
                                    <option value="ADMIN">Admin</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
                                <select
                                    value={formData.department_id}
                                    onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                >
                                    <option value="">Select department (optional)</option>
                                    {departments.map((dept) => (
                                        <option key={dept.id} value={dept.id}>
                                            {dept.code} - {dept.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            {formData.role === "STUDENT" && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Year of Study *</label>
                                        <select
                                            required={formData.role === "STUDENT"}
                                            value={formData.year}
                                            onChange={(e) => {
                                                const yr = e.target.value;
                                                const autoSem = yr ? String(Number(yr) * 2) : "";
                                                setFormData({ ...formData, year: yr, semester: autoSem });
                                            }}
                                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        >
                                            <option value="">Select year</option>
                                            <option value="1">1st Year</option>
                                            <option value="2">2nd Year</option>
                                            <option value="3">3rd Year</option>
                                            <option value="4">4th Year</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Current Semester *</label>
                                        <select
                                            required={formData.role === "STUDENT"}
                                            value={formData.semester}
                                            onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        >
                                            <option value="">Select semester</option>
                                            {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                                                <option key={s} value={s}>Semester {s}</option>
                                            ))}
                                        </select>
                                        {formData.year && formData.semester && (
                                            <p className="text-xs text-slate-400 mt-1">
                                                Year {formData.year} → Semesters {Number(formData.year) * 2 - 1} & {Number(formData.year) * 2}
                                            </p>
                                        )}
                                    </div>
                                </>
                            )}
                            <div className="flex gap-3 pt-4">
                                <Button type="button" variant="secondary" onClick={() => setShowModal(false)} className="flex-1">
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={isSubmitting} className="flex-1">
                                    {isSubmitting ? "Saving..." : editingUser ? "Update User" : "Add User"}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
