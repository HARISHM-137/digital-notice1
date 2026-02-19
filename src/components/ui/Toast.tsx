"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

interface ToastItem {
    id: number;
    message: string;
    type: "success" | "error" | "warning" | "info";
}

let toastId = 0;
const listeners: Array<(toast: ToastItem) => void> = [];

export function showToast(message: string, type: ToastItem["type"] = "info") {
    const toast: ToastItem = { id: ++toastId, message, type };
    listeners.forEach((fn) => fn(toast));
}

const ICONS: Record<string, string> = {
    success: "✓",
    error: "✕",
    warning: "⚠",
    info: "ℹ",
};

const COLORS: Record<string, string> = {
    success: "bg-emerald-500",
    error: "bg-red-500",
    warning: "bg-amber-500",
    info: "bg-blue-500",
};

export function ToastContainer() {
    const [toasts, setToasts] = useState<ToastItem[]>([]);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        const handler = (toast: ToastItem) => {
            setToasts((prev) => [...prev, toast]);
            setTimeout(() => {
                setToasts((prev) => prev.filter((t) => t.id !== toast.id));
            }, 4000);
        };
        listeners.push(handler);
        return () => {
            const idx = listeners.indexOf(handler);
            if (idx > -1) listeners.splice(idx, 1);
        };
    }, []);

    if (!mounted) return null;

    return createPortal(
        <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm">
            {toasts.map((toast) => (
                <div
                    key={toast.id}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl text-white animate-slide-in ${COLORS[toast.type]}`}
                    style={{
                        animation: "slideIn 0.3s ease-out",
                    }}
                >
                    <span className="text-lg font-bold">{ICONS[toast.type]}</span>
                    <span className="text-sm font-medium">{toast.message}</span>
                    <button
                        onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
                        className="ml-auto text-white/70 hover:text-white text-lg"
                    >
                        ×
                    </button>
                </div>
            ))}
            <style jsx global>{`
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `}</style>
        </div>,
        document.body
    );
}
