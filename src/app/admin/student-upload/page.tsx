"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import FileUpload from "@/components/ui/FileUpload";

interface StudentResult {
    name: string;
    email: string;
    register_no: string;
    year: number;
    department: string;
}

interface UploadSummary {
    total: number;
    created: number;
    skipped: number;
    errorCount: number;
    errors: string[];
}

export default function StudentUploadPage() {
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [summary, setSummary] = useState<UploadSummary | null>(null);
    const [students, setStudents] = useState<StudentResult[]>([]);
    const [error, setError] = useState<string | null>(null);

    const handleUpload = async () => {
        if (!file) return;
        setLoading(true);
        setError(null);
        setSummary(null);
        setStudents([]);

        try {
            const formData = new FormData();
            formData.append("file", file);

            const res = await fetch("/api/ai/analyze-students", {
                method: "POST",
                body: formData,
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Upload failed");
            }

            setSummary(data.summary);
            setStudents(data.students || []);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Something went wrong";
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    Student PDF Upload
                </h1>
                <p className="text-slate-500 mt-1">
                    Upload a PDF containing student data. AI will extract and create student accounts automatically.
                </p>
            </div>

            {/* Upload Section */}
            <Card>
                <div className="space-y-4">
                    <FileUpload
                        label="Upload Student List PDF"
                        accept=".pdf"
                        onFileSelect={(f) => { setFile(f); setSummary(null); setError(null); }}
                        helpText="Upload a PDF with student names, register numbers, emails, years, and departments"
                    />
                    <Button onClick={handleUpload} disabled={!file || loading}>
                        {loading ? (
                            <span className="flex items-center gap-2">
                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Processing with AI...
                            </span>
                        ) : (
                            "📋 Upload & Create Students"
                        )}
                    </Button>
                </div>
            </Card>

            {/* Loading */}
            {loading && (
                <Card>
                    <div className="flex flex-col items-center justify-center py-12">
                        <div className="relative w-20 h-20 mb-6">
                            <div className="absolute inset-0 border-4 border-green-200 rounded-full"></div>
                            <div className="absolute inset-0 border-4 border-green-600 rounded-full border-t-transparent animate-spin"></div>
                        </div>
                        <h3 className="text-lg font-semibold text-slate-800">AI is extracting student data...</h3>
                        <p className="text-sm text-slate-500 mt-2">Creating accounts and assigning roles</p>
                    </div>
                </Card>
            )}

            {/* Error */}
            {error && (
                <Card className="border-l-4 border-red-500">
                    <div className="flex items-start gap-3">
                        <svg className="w-6 h-6 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                            <h3 className="font-semibold text-red-800">Upload Failed</h3>
                            <p className="text-red-600 text-sm mt-1">{error}</p>
                        </div>
                    </div>
                </Card>
            )}

            {/* Summary */}
            {summary && (
                <div className="space-y-6">
                    {/* Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                            <div className="text-center">
                                <p className="text-white/80 text-sm">Total Found</p>
                                <p className="text-3xl font-bold">{summary.total}</p>
                            </div>
                        </Card>
                        <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white">
                            <div className="text-center">
                                <p className="text-white/80 text-sm">Created</p>
                                <p className="text-3xl font-bold">{summary.created}</p>
                            </div>
                        </Card>
                        <Card className="bg-gradient-to-br from-yellow-500 to-orange-500 text-white">
                            <div className="text-center">
                                <p className="text-white/80 text-sm">Skipped (Existing)</p>
                                <p className="text-3xl font-bold">{summary.skipped}</p>
                            </div>
                        </Card>
                        <Card className="bg-gradient-to-br from-red-500 to-pink-600 text-white">
                            <div className="text-center">
                                <p className="text-white/80 text-sm">Errors</p>
                                <p className="text-3xl font-bold">{summary.errorCount}</p>
                            </div>
                        </Card>
                    </div>

                    {/* Error Details */}
                    {summary.errors.length > 0 && (
                        <Card className="border-l-4 border-yellow-500">
                            <h3 className="font-semibold text-yellow-800 mb-2">Error Details</h3>
                            <ul className="space-y-1 text-sm text-yellow-700">
                                {summary.errors.map((err, idx) => (
                                    <li key={idx}>• {err}</li>
                                ))}
                            </ul>
                        </Card>
                    )}

                    {/* Students Table */}
                    <Card>
                        <h3 className="text-lg font-bold text-slate-800 mb-4">Extracted Students ({students.length})</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200">
                                        <th className="px-4 py-3 text-left font-semibold text-slate-600">#</th>
                                        <th className="px-4 py-3 text-left font-semibold text-slate-600">Name</th>
                                        <th className="px-4 py-3 text-left font-semibold text-slate-600">Email</th>
                                        <th className="px-4 py-3 text-left font-semibold text-slate-600">Register No</th>
                                        <th className="px-4 py-3 text-left font-semibold text-slate-600">Year</th>
                                        <th className="px-4 py-3 text-left font-semibold text-slate-600">Department</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {students.map((s, idx) => (
                                        <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                                            <td className="px-4 py-3 text-slate-500">{idx + 1}</td>
                                            <td className="px-4 py-3 font-medium text-slate-900">{s.name}</td>
                                            <td className="px-4 py-3 text-slate-600">{s.email}</td>
                                            <td className="px-4 py-3">
                                                <span className="px-2 py-1 text-xs font-medium rounded-full bg-indigo-100 text-indigo-700">
                                                    {s.register_no}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-slate-600">Year {s.year}</td>
                                            <td className="px-4 py-3 text-slate-600">{s.department}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}
