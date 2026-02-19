"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

interface NotificationBellProps {
    userId?: string;
    userRole: "admin" | "faculty" | "student";
}

interface NotificationItem {
    id: string;
    title: string;
    message: string;
    created_at: string;
    is_read: boolean;
}

export default function NotificationBell({ userId, userRole }: NotificationBellProps) {
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        fetchNotifications();
    }, [userRole]);

    const fetchNotifications = async () => {
        try {
            const { data, error } = await supabase
                .from("notifications")
                .select("*")
                .or(`target_role.eq.${userRole.toUpperCase()},target_role.eq.ALL`)
                .order("created_at", { ascending: false })
                .limit(10);

            if (error) throw error;

            const notificationsWithRead = (data || []).map((n) => ({
                ...n,
                is_read: false, // In real app, check user_notifications table
            }));

            setNotifications(notificationsWithRead);
            setUnreadCount(notificationsWithRead.filter((n) => !n.is_read).length);
        } catch (error) {
            console.error("Error fetching notifications:", error);
        }
    };

    const markAsRead = async (notificationId: string) => {
        setNotifications((prev) =>
            prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
                <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                    />
                </svg>
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                        {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden">
                        <div className="px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                            <h3 className="font-semibold">Notifications</h3>
                            <p className="text-xs text-white/80">
                                {unreadCount} unread messages
                            </p>
                        </div>
                        <div className="max-h-80 overflow-y-auto">
                            {notifications.length === 0 ? (
                                <div className="p-6 text-center text-slate-500">
                                    <svg
                                        className="w-12 h-12 mx-auto mb-2 text-slate-300"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={1.5}
                                            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                                        />
                                    </svg>
                                    No notifications yet
                                </div>
                            ) : (
                                notifications.map((notification) => (
                                    <div
                                        key={notification.id}
                                        onClick={() => markAsRead(notification.id)}
                                        className={`px-4 py-3 border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors ${!notification.is_read ? "bg-indigo-50/50" : ""
                                            }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div
                                                className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${notification.is_read ? "bg-slate-300" : "bg-indigo-500"
                                                    }`}
                                            />
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-slate-900 text-sm truncate">
                                                    {notification.title}
                                                </p>
                                                <p className="text-xs text-slate-500 line-clamp-2">
                                                    {notification.message}
                                                </p>
                                                <p className="text-xs text-slate-400 mt-1">
                                                    {new Date(notification.created_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        <div className="px-4 py-2 bg-slate-50 border-t border-slate-200">
                            <a
                                href={`/${userRole}/notifications`}
                                className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                            >
                                View all notifications →
                            </a>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
