"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Subject, Document } from "@/lib/types";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

export default function FacultyDocumentsPage() {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        subject_id: "",
        visibility: "ALL_STUDENTS" as "ALL_STUDENTS" | "SPECIFIC_STUDENTS" | "ADMIN_ONLY",
    });

    useEffect(() => {
        fetchDocuments();
        fetchSubjects();
    }, []);

    const fetchDocuments = async () => {
        try {
            const { data, error } = await supabase
                .from("documents")
                .select("*, subjects(name, code)")
                .order("created_at", { ascending: false });

            if (error) throw error;
            setDocuments(data || []);
        } catch (error) {
            console.error("Error fetching documents:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchSubjects = async () => {
        try {
            const { data, error } = await supabase
                .from("faculty_subjects")
                .select("subjects(*)")
                .order("academic_year", { ascending: false });

            if (error) throw error;
            const subjectsList = data?.map((d: any) => d.subjects).filter(Boolean) || [];
            setSubjects(subjectsList);
        } catch (error) {
            console.error("Error fetching subjects:", error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedFile) {
            alert("Please select a file to upload");
            return;
        }
        setIsSubmitting(true);

        try {
            console.log("Starting file upload...", selectedFile.name, selectedFile.size, "bytes");

            // Upload file to Supabase Storage
            const fileExt = selectedFile.name.split(".").pop();
            const fileName = `${Date.now()}_${selectedFile.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
            const fileType = selectedFile.type || `application/${fileExt}`;

            console.log("Uploading to storage:", fileName);
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from("documents")
                .upload(fileName, selectedFile, {
                    cacheControl: "3600",
                    upsert: false
                });

            if (uploadError) {
                console.error("Storage upload error:", uploadError);
                throw new Error(`Storage upload failed: ${uploadError.message}`);
            }

            console.log("Upload successful:", uploadData);

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from("documents")
                .getPublicUrl(fileName);

            console.log("Public URL generated:", publicUrl);

            // Save document record
            const { error: dbError } = await supabase.from("documents").insert({
                file_name: selectedFile.name,
                file_url: publicUrl,
                file_type: fileType,
                subject_id: formData.subject_id || null,
            });

            if (dbError) {
                console.error("Database insert error:", dbError);
                throw new Error(`Database error: ${dbError.message}`);
            }

            console.log("Document record saved successfully");

            // Create notification (using new schema)
            const { error: notifError } = await supabase.from("notifications").insert({
                title: "New Document Uploaded",
                message: `${formData.title || selectedFile.name} has been uploaded`,
                document_url: publicUrl,
                document_name: selectedFile.name,
                role_target: "STUDENT",
            });

            if (notifError) {
                console.warn("Notification creation failed (non-critical):", notifError);
            }

            setFormData({ title: "", description: "", subject_id: "", visibility: "ALL_STUDENTS" });
            setSelectedFile(null);
            setShowModal(false);
            fetchDocuments();
            alert("Document uploaded successfully!");
        } catch (error: any) {
            console.error("Error uploading document:", error);
            const errorMessage = error?.message || error?.error_description || "Unknown error occurred";
            alert(`Error uploading document: ${errorMessage}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (docId: string) => {
        if (confirm("Are you sure you want to delete this document?")) {
            try {
                const { error } = await supabase.from("documents").delete().eq("id", docId);
                if (error) throw error;
                fetchDocuments();
            } catch (error) {
                console.error("Error deleting document:", error);
                alert("Error deleting document. Please try again.");
            }
        }
    };

    const getFileIcon = (url: string) => {
        if (url.includes(".pdf")) return "📄";
        if (url.includes(".doc")) return "📝";
        if (url.includes(".ppt")) return "📊";
        if (url.includes(".xls")) return "📈";
        return "📁";
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
                    <h1 className="text-2xl font-bold text-slate-900">Documents</h1>
                    <p className="text-slate-500">Upload and manage documents</p>
                </div>
                <Button onClick={() => { setFormData({ title: "", description: "", subject_id: "", visibility: "ALL_STUDENTS" }); setSelectedFile(null); setShowModal(true); }}>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    Upload Document
                </Button>
            </div>

            {/* Stats */}
            <Card className="bg-gradient-to-br from-cyan-500 to-blue-600 text-white">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/20 rounded-lg">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-white/80 text-sm">Total Documents</p>
                        <p className="text-2xl font-bold">{documents.length}</p>
                    </div>
                </div>
            </Card>

            {/* Documents Grid */}
            {documents.length === 0 ? (
                <Card>
                    <div className="text-center py-12 text-slate-500">
                        <svg className="w-16 h-16 mx-auto mb-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-lg font-medium">No documents yet</p>
                        <p className="text-sm">Upload your first document</p>
                    </div>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {documents.map((doc: any) => (
                        <Card key={doc.id} className="hover:shadow-lg transition-shadow">
                            <div className="flex items-start gap-3 mb-3">
                                <span className="text-3xl">{getFileIcon(doc.file_url)}</span>
                                <div className="flex-1">
                                    <h3 className="font-semibold text-slate-900 line-clamp-1">{doc.title}</h3>
                                    <p className="text-sm text-slate-500">{doc.subjects?.code || "General"}</p>
                                </div>
                            </div>
                            {doc.description && (
                                <p className="text-sm text-slate-600 line-clamp-2 mb-3">{doc.description}</p>
                            )}
                            <div className="flex items-center justify-between">
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${doc.visibility === "ALL_STUDENTS" ? "bg-green-100 text-green-700" : doc.visibility === "ADMIN_ONLY" ? "bg-purple-100 text-purple-700" : "bg-yellow-100 text-yellow-700"}`}>
                                    {(doc.visibility || "ALL_STUDENTS").replace("_", " ")}
                                </span>
                                <span className="text-xs text-slate-400">{new Date(doc.created_at).toLocaleDateString()}</span>
                            </div>
                            <div className="mt-4 pt-4 border-t border-slate-100 flex gap-3">
                                <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">View</a>
                                <button onClick={() => handleDelete(doc.id)} className="text-sm text-red-600 hover:text-red-800 font-medium">Delete</button>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {/* Upload Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
                        <div className="px-6 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 text-white">
                            <h2 className="text-xl font-bold">Upload Document</h2>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">File *</label>
                                <input
                                    type="file"
                                    required
                                    accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,.txt,.jpg,.jpeg,.png"
                                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
                                <input type="text" required value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500" placeholder="e.g., Unit 1 Notes" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500" placeholder="Brief description..." />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
                                    <select value={formData.subject_id} onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500">
                                        <option value="">General</option>
                                        {subjects.map((s) => (
                                            <option key={s.id} value={s.id}>{s.code}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Visibility *</label>
                                    <select required value={formData.visibility} onChange={(e) => setFormData({ ...formData, visibility: e.target.value as any })} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500">
                                        <option value="ALL_STUDENTS">All Students</option>
                                        <option value="SPECIFIC_STUDENTS">Specific Students</option>
                                        <option value="ADMIN_ONLY">Admin Only</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <Button type="button" variant="secondary" onClick={() => setShowModal(false)} className="flex-1">Cancel</Button>
                                <Button type="submit" disabled={isSubmitting} className="flex-1">{isSubmitting ? "Uploading..." : "Upload"}</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
