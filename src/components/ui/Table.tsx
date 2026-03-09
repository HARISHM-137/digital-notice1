"use client";

import { useState } from "react";

interface Column {
    key: string;
    label: string;
    render?: (value: unknown, row: Record<string, unknown>) => React.ReactNode;
}

interface TableProps {
    columns: Column[];
    data: Record<string, unknown>[];
    onEdit?: (row: Record<string, unknown>) => void;
    onDelete?: (row: Record<string, unknown>) => void;
    showActions?: boolean;
}

export default function Table({
    columns,
    data,
    onEdit,
    onDelete,
    showActions = true,
}: TableProps) {
    const [sortKey, setSortKey] = useState<string | null>(null);
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

    const handleSort = (key: string) => {
        if (sortKey === key) {
            setSortOrder(sortOrder === "asc" ? "desc" : "asc");
        } else {
            setSortKey(key);
            setSortOrder("asc");
        }
    };

    const sortedData = [...data].sort((a, b) => {
        if (!sortKey) return 0;
        const aVal = String(a[sortKey] || "");
        const bVal = String(b[sortKey] || "");
        return sortOrder === "asc"
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal);
    });

    return (
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="table-header">
                            {columns.map((col) => (
                                <th
                                    key={col.key}
                                    className="px-6 py-4 cursor-pointer hover:bg-slate-200 transition-colors"
                                    onClick={() => handleSort(col.key)}
                                >
                                    <div className="flex items-center gap-2">
                                        {col.label}
                                        {sortKey === col.key && (
                                            <span className="text-primary-600">
                                                {sortOrder === "asc" ? "↑" : "↓"}
                                            </span>
                                        )}
                                    </div>
                                </th>
                            ))}
                            {showActions && <th className="px-6 py-4">Actions</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {sortedData.map((row, idx) => (
                            <tr key={idx} className="table-row">
                                {columns.map((col) => (
                                    <td key={col.key} className="px-6 py-4 text-slate-700">
                                        {col.render
                                            ? col.render(row[col.key], row)
                                            : String(row[col.key] || "")}
                                    </td>
                                ))}
                                {showActions && (
                                    <td className="px-6 py-4">
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => onEdit?.(row)}
                                                className="px-3 py-1.5 text-sm bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200 transition-colors"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => onDelete?.(row)}
                                                className="px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {data.length === 0 && (
                <div className="text-center py-12 text-slate-500">
                    No data available
                </div>
            )}
        </div>
    );
}
