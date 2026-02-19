"use client";

import { useState, useRef } from "react";

interface FileUploadProps {
    label: string;
    accept?: string;
    onFileSelect?: (file: File) => void;
    helpText?: string;
}

export default function FileUpload({
    label,
    accept = ".pdf,.doc,.docx",
    onFileSelect,
    helpText,
}: FileUploadProps) {
    const [dragOver, setDragOver] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(true);
    };

    const handleDragLeave = () => {
        setDragOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) {
            setSelectedFile(file);
            onFileSelect?.(file);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            onFileSelect?.(file);
        }
    };

    return (
        <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">{label}</label>
            <div
                onClick={() => inputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`
          border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
          transition-all duration-200
          ${dragOver
                        ? "border-primary-500 bg-primary-50"
                        : "border-slate-300 hover:border-primary-400 hover:bg-slate-50"
                    }
        `}
            >
                <input
                    ref={inputRef}
                    type="file"
                    accept={accept}
                    onChange={handleChange}
                    className="hidden"
                />

                {selectedFile ? (
                    <div className="flex items-center justify-center gap-3">
                        <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div className="text-left">
                            <p className="font-medium text-slate-700">{selectedFile.name}</p>
                            <p className="text-sm text-slate-500">
                                {(selectedFile.size / 1024).toFixed(2)} KB
                            </p>
                        </div>
                    </div>
                ) : (
                    <>
                        <svg className="w-12 h-12 mx-auto text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <p className="mt-4 text-slate-600">
                            <span className="font-medium text-primary-600">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-sm text-slate-500 mt-1">{helpText || `Accepted: ${accept}`}</p>
                    </>
                )}
            </div>
        </div>
    );
}
