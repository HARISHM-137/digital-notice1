"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import Card from "@/components/ui/Card";

export default function StudentDocumentsPage() {
    const [documents, setDocuments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDocuments();
    }, []);

    const fetchDocuments = async () => {
        try {
            const { data, error } = await supabase
                .from("documents")
                .select("*, subjects(name, code)")
                .in("visibility", ["ALL_STUDENTS", "SPECIFIC_STUDENTS"])
                .order("created_at", { ascending: false });

            if (error) throw error;
            setDocuments(data || []);
        } catch (error) {
            console.error("Error fetching documents:", error);
        } finally {
            setLoading(false);
        }
    };

    const getFileIcon = (url: string) => {
        if (url?.includes(".pdf")) return "📄";
        if (url?.includes(".doc")) return "📝";
        if (url?.includes(".ppt")) return "📊";
        if (url?.includes(".xls")) return "📈";
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
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Documents</h1>
                <p className="text-slate-500">Study materials and resources</p>
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
                        <p className="text-white/80 text-sm">Available Documents</p>
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
                        <p className="text-lg font-medium">No documents available</p>
                        <p className="text-sm">Check back later for study materials</p>
                    </div>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {documents.map((doc) => (
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
                                <span className="text-xs text-slate-400">{new Date(doc.created_at).toLocaleDateString()}</span>
                                <a
                                    href={doc.file_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3 py-1 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
                                >
                                    Download
                                </a>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
