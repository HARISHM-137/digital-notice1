import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ToastContainer } from "@/components/ui/Toast";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "CO-PO Attainment Management System",
    description: "A comprehensive system for managing Course Outcome and Program Outcome attainment for NBA accreditation",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className={inter.className}>
                {children}
                <ToastContainer />
            </body>
        </html>
    );
}

