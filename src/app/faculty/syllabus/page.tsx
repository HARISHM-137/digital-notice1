"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import FileUpload from "@/components/ui/FileUpload";
import Button from "@/components/ui/Button";
import FormInput from "@/components/ui/FormInput";

export default function SyllabusUploadPage() {
    const [selectedSubject, setSelectedSubject] = useState("");
    const [subjects, setSubjects] = useState<any[]>([]);
    const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        fetchSubjects();
    }, []);

    useEffect(() => {
        if (selectedSubject) {
            fetchSyllabusFiles();
        }
    }, [selectedSubject]);

    const fetchSubjects = async () => {
        try {
            const { data, error } = await supabase
                .from("faculty_subjects")
                .select("subject:subjects(id, name, code)");

            if (error) throw error;
            const formattedSubjects = data?.map((item: any) => ({
                label: `${item.subject.code} - ${item.subject.name}`,
                value: item.subject.id,
            })) || [];

            setSubjects(formattedSubjects);
            if (formattedSubjects.length > 0) {
                setSelectedSubject(formattedSubjects[0].value);
            }
        } catch (error) {
            console.error("Error fetching subjects:", error);
        }
    };

    const fetchSyllabusFiles = async () => {
        try {
            const { data, error } = await supabase
                .from("documents")
                .select("*")
                .eq("subject_id", selectedSubject)
                .ilike("description", "%[SYLLABUS]%") // Filter by tag
                .order("created_at", { ascending: false });

            if (error) throw error;
            setUploadedFiles(data || []);
        } catch (error) {
            console.error("Error fetching syllabus:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (file: File) => {
        setUploading(true);
        try {
            // 1. Upload to Storage
            const fileExt = file.name.split(".").pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `syllabus/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from("documents")
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from("documents")
                .getPublicUrl(filePath);

            // 2. Insert into Database
            const { error: dbError } = await supabase
                .from("documents")
                .insert({
                    title: file.name,
                    description: "[SYLLABUS] Course Syllabus",
                    file_url: publicUrl,
                    subject_id: selectedSubject,
                    visibility: "ALL_STUDENTS", // Default visibility
                });

            if (dbError) throw dbError;

            fetchSyllabusFiles();
            alert("Syllabus uploaded successfully!");
        } catch (error) {
            console.error("Error uploading syllabus:", error);
            alert("Upload failed. Please try again.");
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this syllabus?")) return;
        try {
            const { error } = await supabase
                .from("documents")
                .delete()
                .eq("id", id);

            if (error) throw error;
            fetchSyllabusFiles();
        } catch (error) {
            console.error("Error deleting syllabus:", error);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-slate-800">Syllabus Upload</h1>
                <p className="text-slate-600 mt-1">Upload and manage course syllabus documents</p>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
                {/* Upload Section */}
                <div className="bg-white rounded-xl shadow-md p-6">
                    <h3 className="text-lg font-semibold text-slate-800 mb-4">Upload New Document</h3>

                    <div className="space-y-4">
                        <FormInput
                            label="Select Subject"
                            name="subject"
                            as="select"
                            options={subjects}
                            value={selectedSubject}
                            onChange={(e) => setSelectedSubject(e.target.value)}
                        />

                        <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center">
                            <FileUpload
                                label=""
                                accept=".pdf,.doc,.docx"
                                helpText="PDF, DOC, or DOCX up to 10MB"
                                onFileSelect={handleFileUpload}
                            />
                            {uploading && <p className="text-sm text-indigo-600 mt-2">Uploading...</p>}
                        </div>
                    </div>
                </div>

                {/* Uploaded Files */}
                <div className="bg-white rounded-xl shadow-md p-6">
                    <h3 className="text-lg font-semibold text-slate-800 mb-4">Uploaded Documents</h3>

                    {loading ? (
                        <div className="text-center py-8 text-slate-500">Loading...</div>
                    ) : uploadedFiles.length === 0 ? (
                        <div className="text-center py-8 text-slate-500">
                            <p>No syllabus uploaded yet.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {uploadedFiles.map((file) => (
                                <div
                                    key={file.id}
                                    className="flex items-center gap-4 p-4 border border-slate-200 rounded-lg hover:border-slate-300 transition-colors"
                                >
                                    <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-slate-800 truncate">{file.title}</p>
                                        <p className="text-sm text-slate-500">
                                            {new Date(file.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <a href={file.file_url} target="_blank" rel="noopener noreferrer" className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                            </svg>
                                        </a>
                                        <button onClick={() => handleDelete(file.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <h4 className="font-semibold text-blue-800 mb-2">📘 Upload Guidelines</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Upload the official syllabus as approved by the Board of Studies</li>
                    <li>• Include unit-wise topics and learning outcomes</li>
                    <li>• Ensure CO mapping is included in the document</li>
                    <li>• Valid file formats: PDF, DOC, DOCX (Max 10MB)</li>
                </ul>
            </div>
        </div>
    );
}
