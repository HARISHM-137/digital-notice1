"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { showToast } from "@/components/ui/Toast";

interface SurveyQuestion {
    id: string;
    question_text: string;
    question_number: number;
    co_id: string;
    course_outcomes?: { co_number: number; description: string };
}

interface Survey {
    id: string;
    title: string;
    subject_id: string;
    survey_questions: SurveyQuestion[];
    my_responses?: { question_id: string; rating: number }[];
}

interface SubjectWithSurveys {
    id: string;
    name: string;
    code: string;
    survey_count: number;
}

export default function StudentSurveyPage() {
    const [subjects, setSubjects] = useState<SubjectWithSurveys[]>([]);
    const [selectedSubject, setSelectedSubject] = useState<string>("");
    const [surveys, setSurveys] = useState<Survey[]>([]);
    const [activeSurvey, setActiveSurvey] = useState<Survey | null>(null);
    const [ratings, setRatings] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [userId, setUserId] = useState("");

    useEffect(() => {
        fetchUser();
    }, []);

    useEffect(() => {
        if (selectedSubject && userId) {
            fetchSurveys();
        }
    }, [selectedSubject, userId]);

    const fetchUser = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                setUserId(session.user.id);
                // Directly fetch enrolled subjects that have surveys
                const { data: enrollments } = await supabase
                    .from("student_subjects")
                    .select("subject_id, subjects(id, name, code)")
                    .eq("student_id", session.user.id);

                if (enrollments && enrollments.length > 0) {
                    const subjectsList = enrollments
                        .map((e: any) => e.subjects)
                        .filter(Boolean);
                    setSubjects(subjectsList);
                    if (subjectsList.length > 0) {
                        setSelectedSubject(subjectsList[0].id);
                    }
                }
            }
        } catch (error) {
            console.error("Error:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchSurveys = async () => {
        try {
            const res = await fetch(`/api/surveys?subject_id=${selectedSubject}&student_id=${userId}`);
            const data = await res.json();
            setSurveys(data.surveys || []);

            if (data.surveys?.length > 0) {
                const survey = data.surveys[0];
                setActiveSurvey(survey);

                // Pre-fill existing responses
                const existingRatings: Record<string, number> = {};
                if (survey.my_responses) {
                    survey.my_responses.forEach((r: any) => {
                        existingRatings[r.question_id] = r.rating;
                    });
                }
                setRatings(existingRatings);
                setSubmitted(Object.keys(existingRatings).length > 0);
            } else {
                setActiveSurvey(null);
                setRatings({});
                setSubmitted(false);
            }
        } catch (error) {
            console.error("Error fetching surveys:", error);
        }
    };

    const handleSubmit = async () => {
        if (!activeSurvey) return;

        const questions = activeSurvey.survey_questions;
        const missing = questions.filter((q) => !ratings[q.id]);
        if (missing.length > 0) {
            showToast("Please rate all course outcomes before submitting", "error");
            return;
        }

        setSubmitting(true);
        try {
            const responses = Object.entries(ratings).map(([question_id, rating]) => ({
                question_id,
                rating,
            }));

            const res = await fetch("/api/surveys", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    survey_id: activeSurvey.id,
                    student_id: userId,
                    responses,
                }),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Submission failed");
            }

            showToast("Survey submitted successfully! Thank you for your feedback.", "success");
            setSubmitted(true);
        } catch (error: any) {
            showToast(error.message || "Failed to submit survey", "error");
        } finally {
            setSubmitting(false);
        }
    };

    const StarRating = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => (
        <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
                <button
                    key={star}
                    type="button"
                    onClick={() => onChange(star)}
                    className={`w-10 h-10 rounded-lg text-lg font-bold transition-all ${star <= value
                            ? "bg-amber-400 text-white shadow-md scale-105"
                            : "bg-slate-100 text-slate-400 hover:bg-amber-100 hover:text-amber-500"
                        }`}
                >
                    {star}
                </button>
            ))}
        </div>
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-slate-800">Course Exit Survey</h1>
                <p className="text-slate-600 mt-1">
                    Rate your achievement of Course Outcomes (1 = Low, 5 = High)
                </p>
            </div>

            {/* Subject Selector */}
            <Card className="p-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">Select Subject</label>
                <select
                    value={selectedSubject}
                    onChange={(e) => {
                        setSelectedSubject(e.target.value);
                        setSubmitted(false);
                    }}
                    className="w-full max-w-md px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                    <option value="">Choose a subject</option>
                    {subjects.map((s) => (
                        <option key={s.id} value={s.id}>
                            {s.code} - {s.name}
                        </option>
                    ))}
                </select>
            </Card>

            {/* Survey Form */}
            {selectedSubject && !activeSurvey && (
                <Card>
                    <div className="text-center py-12 text-slate-500">
                        <svg className="w-16 h-16 mx-auto mb-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-lg font-medium">No active survey for this subject</p>
                        <p className="text-sm">Your faculty will create a survey when ready.</p>
                    </div>
                </Card>
            )}

            {activeSurvey && (
                <Card>
                    <div className="mb-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold text-slate-800">{activeSurvey.title}</h2>
                            {submitted && (
                                <span className="px-3 py-1 text-sm font-bold rounded-full bg-green-100 text-green-700">
                                    ✓ Submitted
                                </span>
                            )}
                        </div>
                        <p className="text-sm text-slate-500 mt-1">
                            Rate your achievement level for each Course Outcome
                        </p>
                    </div>

                    <div className="space-y-4">
                        {activeSurvey.survey_questions
                            .sort((a, b) => a.question_number - b.question_number)
                            .map((q, idx) => (
                                <div
                                    key={q.id}
                                    className={`p-4 rounded-xl border transition-all ${ratings[q.id]
                                            ? "border-amber-200 bg-amber-50/30"
                                            : "border-slate-200 bg-white"
                                        }`}
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="px-2 py-1 text-xs font-bold rounded bg-emerald-100 text-emerald-700">
                                                    CO{q.course_outcomes?.co_number || idx + 1}
                                                </span>
                                            </div>
                                            <p className="text-slate-700 text-sm">
                                                {q.question_text || q.course_outcomes?.description || `Rate CO${idx + 1} achievement`}
                                            </p>
                                        </div>
                                        <StarRating
                                            value={ratings[q.id] || 0}
                                            onChange={(v) =>
                                                !submitted && setRatings((prev) => ({ ...prev, [q.id]: v }))
                                            }
                                        />
                                    </div>
                                </div>
                            ))}
                    </div>

                    {!submitted && (
                        <div className="mt-6 flex justify-end">
                            <Button onClick={handleSubmit} disabled={submitting}>
                                {submitting ? "Submitting..." : "Submit Survey"}
                            </Button>
                        </div>
                    )}

                    {submitted && (
                        <div className="mt-6 p-4 bg-green-50 rounded-xl border border-green-200 text-center">
                            <p className="text-green-700 font-medium">
                                ✓ Thank you! Your feedback has been recorded.
                            </p>
                            <p className="text-green-600 text-sm mt-1">
                                You can update your ratings by changing them above and re-submitting.
                            </p>
                            <Button
                                className="mt-3"
                                variant="outline"
                                onClick={() => setSubmitted(false)}
                            >
                                Update My Ratings
                            </Button>
                        </div>
                    )}
                </Card>
            )}
        </div>
    );
}
