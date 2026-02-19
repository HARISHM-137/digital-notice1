import Link from "next/link";

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 flex flex-col">
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-50">
                <nav className="max-w-7xl mx-auto px-6 py-4 flex items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-primary-800 rounded-xl flex items-center justify-center">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                            </svg>
                        </div>
                        <span className="text-xl font-bold gradient-text">CO–PO Attainment System</span>
                    </div>
                </nav>
            </header>

            {/* Hero Section */}
            <main className="flex-1 flex flex-col items-center justify-center max-w-7xl mx-auto px-6 py-20 w-full">
                <div className="text-center space-y-6 animate-fade-in w-full">
                    {/* Title */}
                    <h1 className="text-5xl md:text-6xl font-bold text-slate-800 leading-tight">
                        CO–PO Attainment
                        <span className="block gradient-text">Management System</span>
                    </h1>

                    {/* Subtitle */}
                    <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
                        A centralized platform to manage Course Outcomes (CO), Program Outcomes (PO),
                        mapping, assessment, and attainment calculation.
                    </p>

                    {/* Role Login Buttons */}
                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-6">
                        <Link
                            href="/login?role=admin"
                            className="group relative overflow-hidden bg-gradient-to-r from-primary-600 to-primary-700 text-white px-8 py-4 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 w-64 text-center"
                        >
                            <span className="relative z-10 flex items-center justify-center gap-2">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                Login as Admin
                            </span>
                        </Link>

                        <Link
                            href="/login?role=faculty"
                            className="group relative overflow-hidden bg-gradient-to-r from-secondary-600 to-secondary-700 text-white px-8 py-4 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 w-64 text-center"
                        >
                            <span className="relative z-10 flex items-center justify-center gap-2">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                </svg>
                                Login as Faculty
                            </span>
                        </Link>

                        <Link
                            href="/login?role=student"
                            className="group relative overflow-hidden bg-gradient-to-r from-slate-600 to-slate-700 text-white px-8 py-4 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 w-64 text-center"
                        >
                            <span className="relative z-10 flex items-center justify-center gap-2">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                Login as Student
                            </span>
                        </Link>
                    </div>
                </div>

                {/* About OBE Section */}
                <div className="mt-20 bg-white rounded-3xl p-10 shadow-lg w-full">
                    <h2 className="text-3xl font-bold text-slate-800 mb-8 text-center">
                        About Outcome-Based Education
                    </h2>
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="bg-slate-50 rounded-2xl p-6 flex flex-col">
                            <h3 className="text-xl font-semibold text-primary-700 mb-3">What is OBE?</h3>
                            <p className="text-slate-600 leading-relaxed">
                                Outcome-Based Education (OBE) focuses on measuring student performance
                                through clearly defined learning outcomes.
                            </p>
                        </div>
                        <div className="bg-slate-50 rounded-2xl p-6 flex flex-col">
                            <h3 className="text-xl font-semibold text-primary-700 mb-3">Accreditation Support</h3>
                            <p className="text-slate-600 leading-relaxed">
                                The system supports outcome tracking, CO–PO mapping, and attainment
                                reporting aligned with accreditation standards.
                            </p>
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="bg-slate-800 text-white py-8">
                <div className="max-w-7xl mx-auto px-6 text-center">
                    <p className="text-slate-400 text-sm">
                        © 2026 CO–PO Attainment Management System
                    </p>
                </div>
            </footer>
        </div>
    );
}
