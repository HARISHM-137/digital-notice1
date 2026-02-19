"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import FileUpload from "@/components/ui/FileUpload";

interface AIAnalysis {
    subject: { name: string; code: string; semester: string; credits: string };
    course_outcomes: Array<{ co_number: string; description: string }>;
    program_outcomes: Array<{ po_number: string; description: string }>;
    co_po_mapping: Array<{ co_number: string; po_number: string; correlation_level: number }>;
}

export default function AIUploadPage() {
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<AIAnalysis | null>(null);
    const [subjectId, setSubjectId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleAnalyze = async () => {
        if (!file) return;
        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const formData = new FormData();
            formData.append("file", file);

            const res = await fetch("/api/ai/analyze-document", {
                method: "POST",
                body: formData,
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Analysis failed");
            }

            setResult(data.analysis);
            setSubjectId(data.subjectId);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Something went wrong";
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    const correlationColor = (level: number) => {
        switch (level) {
            case 3: return "bg-emerald-500 text-white";
            case 2: return "bg-yellow-400 text-slate-900";
            case 1: return "bg-orange-300 text-slate-900";
            default: return "bg-slate-100 text-slate-400";
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <svg className="w-7 h-7 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    AI Document Analysis
                </h1>
                <p className="text-slate-500 mt-1">Upload a syllabus document and let AI extract Subjects, COs, POs, and CO-PO Mappings automatically</p>
            </div>

            {/* Upload Section */}
            <Card>
                <div className="space-y-4">
                    <FileUpload
                        label="Upload Syllabus Document"
                        accept=".pdf,.doc,.docx"
                        onFileSelect={(f) => { setFile(f); setResult(null); setError(null); }}
                        helpText="Accepted formats: PDF, DOC, DOCX (max 10MB)"
                    />

                    <div className="flex gap-3">
                        <Button
                            onClick={handleAnalyze}
                            disabled={!file || loading}
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Analyzing with AI...
                                </span>
                            ) : (
                                "🚀 Analyze Document"
                            )}
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Error State */}
            {error && (
                <Card className="border-l-4 border-red-500">
                    <div className="flex items-start gap-3">
                        <svg className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                            <h3 className="font-semibold text-red-800">Analysis Failed</h3>
                            <p className="text-red-600 text-sm mt-1">{error}</p>
                        </div>
                    </div>
                </Card>
            )}

            {/* Loading State */}
            {loading && (
                <Card>
                    <div className="flex flex-col items-center justify-center py-12">
                        <div className="relative w-20 h-20 mb-6">
                            <div className="absolute inset-0 border-4 border-purple-200 rounded-full"></div>
                            <div className="absolute inset-0 border-4 border-purple-600 rounded-full border-t-transparent animate-spin"></div>
                            <div className="absolute inset-3 border-4 border-indigo-200 rounded-full"></div>
                            <div className="absolute inset-3 border-4 border-indigo-500 rounded-full border-b-transparent animate-spin" style={{ animationDirection: "reverse", animationDuration: "1.5s" }}></div>
                        </div>
                        <h3 className="text-lg font-semibold text-slate-800">AI is analyzing your document...</h3>
                        <p className="text-sm text-slate-500 mt-2">This may take 15–30 seconds</p>
                    </div>
                </Card>
            )}

            {/* Results */}
            {result && (
                <div className="space-y-6">
                    {/* Success Banner */}
                    <Card className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <div>
                                    <h3 className="text-lg font-bold">Analysis Complete & Data Saved!</h3>
                                    <p className="text-white/80 text-sm">All data has been automatically inserted into the database</p>
                                </div>
                            </div>
                            {subjectId && (
                                <a
                                    href={`/faculty/subjects/${subjectId}`}
                                    className="px-4 py-2 bg-white text-emerald-700 rounded-lg font-medium hover:bg-emerald-50 transition-colors"
                                >
                                    View Subject →
                                </a>
                            )}
                        </div>
                    </Card>

                    {/* Subject Info */}
                    <Card>
                        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <span className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center text-sm font-bold">S</span>
                            Subject Information
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-slate-50 p-3 rounded-lg">
                                <p className="text-xs text-slate-500 uppercase tracking-wide">Name</p>
                                <p className="font-semibold text-slate-800 mt-1">{result.subject.name}</p>
                            </div>
                            <div className="bg-slate-50 p-3 rounded-lg">
                                <p className="text-xs text-slate-500 uppercase tracking-wide">Code</p>
                                <p className="font-semibold text-slate-800 mt-1">{result.subject.code}</p>
                            </div>
                            <div className="bg-slate-50 p-3 rounded-lg">
                                <p className="text-xs text-slate-500 uppercase tracking-wide">Semester</p>
                                <p className="font-semibold text-slate-800 mt-1">{result.subject.semester}</p>
                            </div>
                            <div className="bg-slate-50 p-3 rounded-lg">
                                <p className="text-xs text-slate-500 uppercase tracking-wide">Credits</p>
                                <p className="font-semibold text-slate-800 mt-1">{result.subject.credits}</p>
                            </div>
                        </div>
                    </Card>

                    {/* Course Outcomes */}
                    <Card>
                        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <span className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center text-sm font-bold">CO</span>
                            Course Outcomes ({result.course_outcomes.length})
                        </h3>
                        <div className="space-y-2">
                            {result.course_outcomes.map((co, idx) => (
                                <div key={idx} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                                    <span className="px-2 py-1 text-xs font-bold rounded bg-emerald-100 text-emerald-700 flex-shrink-0">
                                        {co.co_number}
                                    </span>
                                    <p className="text-sm text-slate-700">{co.description}</p>
                                </div>
                            ))}
                        </div>
                    </Card>

                    {/* Program Outcomes */}
                    <Card>
                        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center text-sm font-bold">PO</span>
                            Program Outcomes ({result.program_outcomes.length})
                        </h3>
                        <div className="space-y-2">
                            {result.program_outcomes.map((po, idx) => (
                                <div key={idx} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                                    <span className="px-2 py-1 text-xs font-bold rounded bg-blue-100 text-blue-700 flex-shrink-0">
                                        {po.po_number}
                                    </span>
                                    <p className="text-sm text-slate-700">{po.description}</p>
                                </div>
                            ))}
                        </div>
                    </Card>

                    {/* CO-PO Mapping Heatmap */}
                    <Card>
                        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <span className="w-8 h-8 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center text-sm font-bold">M</span>
                            CO-PO Mapping Matrix
                        </h3>
                        <div className="flex items-center gap-4 mb-4 text-xs">
                            <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-emerald-500 inline-block"></span> 3 – High</span>
                            <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-yellow-400 inline-block"></span> 2 – Medium</span>
                            <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-orange-300 inline-block"></span> 1 – Low</span>
                            <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-slate-100 inline-block border"></span> – No mapping</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr>
                                        <th className="px-3 py-2 text-left bg-slate-50 rounded-tl-lg">CO / PO</th>
                                        {result.program_outcomes.map((po) => (
                                            <th key={po.po_number} className="px-3 py-2 text-center bg-slate-50 text-xs font-bold">
                                                {po.po_number}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {result.course_outcomes.map((co) => (
                                        <tr key={co.co_number} className="border-t border-slate-100">
                                            <td className="px-3 py-2 font-bold text-xs">{co.co_number}</td>
                                            {result.program_outcomes.map((po) => {
                                                const mapping = result.co_po_mapping.find(
                                                    (m) => m.co_number === co.co_number && m.po_number === po.po_number
                                                );
                                                return (
                                                    <td key={po.po_number} className="px-1 py-1 text-center">
                                                        <span className={`inline-flex w-8 h-8 items-center justify-center rounded text-xs font-bold ${correlationColor(mapping?.correlation_level || 0)}`}>
                                                            {mapping?.correlation_level || "-"}
                                                        </span>
                                                    </td>
                                                );
                                            })}
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
