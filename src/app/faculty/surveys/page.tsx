"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { showToast } from "@/components/ui/Toast";

interface SubjectOption { id: string; name: string; code: string; }
interface SurveyQuestion { id: string; question_number: number; question_text: string; co_id: string | null; course_outcomes?: { co_number: number; description: string } | null; }
interface Survey { id: string; title: string; subject_id: string; is_active: boolean; created_at: string; survey_questions: SurveyQuestion[]; response_count?: number; }
interface CO { id: string; co_number: number; description: string; }

export default function FacultySurveysPage() {
    const [subjects, setSubjects] = useState<SubjectOption[]>([]);
    const [selectedSubject, setSelectedSubject] = useState("");
    const [surveys, setSurveys] = useState<Survey[]>([]);
    const [cos, setCos] = useState<CO[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);

    // Create survey form state
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const [questions, setQuestions] = useState<{ text: string; co_id: string; options: string[] }[]>([]);

    useEffect(() => { fetchSubjects(); }, []);
    useEffect(() => { if (selectedSubject) { fetchSurveys(); fetchCOs(); } }, [selectedSubject]);

    const fetchSubjects = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            const { data, error } = await supabase
                .from("faculty_subjects")
                .select("subject:subjects(id, name, code)")
                .eq("faculty_id", user.id);
            if (error) throw error;
            const formatted = (data || []).map((item: any) => item.subject).filter(Boolean);
            setSubjects(formatted);
            if (formatted.length > 0) setSelectedSubject(formatted[0].id);
        } catch (error) { console.error("Error:", error); }
        finally { setLoading(false); }
    };

    const fetchCOs = async () => {
        const { data } = await supabase
            .from("course_outcomes")
            .select("id, co_number, description")
            .eq("subject_id", selectedSubject)
            .order("co_number");
        setCos(data || []);
    };

    const fetchSurveys = async () => {
        try {
            const { data, error } = await supabase
                .from("surveys")
                .select("*, survey_questions(*, course_outcomes(co_number, description))")
                .eq("subject_id", selectedSubject)
                .order("created_at", { ascending: false });
            if (error) throw error;

            // Fetch response counts
            const surveysWithCounts = await Promise.all((data || []).map(async (s: any) => {
                const qIds = s.survey_questions?.map((q: any) => q.id) || [];
                let count = 0;
                if (qIds.length > 0) {
                    const { count: c } = await supabase
                        .from("survey_responses")
                        .select("respondent_id", { count: "exact", head: true })
                        .eq("survey_id", s.id);
                    count = c || 0;
                }
                return { ...s, response_count: count };
            }));
            setSurveys(surveysWithCounts);
        } catch (error) { console.error("Error fetching surveys:", error); }
    };

    const addQuestion = () => {
        setQuestions([...questions, { text: "", co_id: "", options: ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"] }]);
    };

    const updateQuestion = (idx: number, field: string, value: string) => {
        setQuestions(prev => prev.map((q, i) => i === idx ? { ...q, [field]: value } : q));
    };

    const updateOption = (qIdx: number, optIdx: number, value: string) => {
        setQuestions(prev => prev.map((q, i) => {
            if (i !== qIdx) return q;
            const newOpts = [...q.options];
            newOpts[optIdx] = value;
            return { ...q, options: newOpts };
        }));
    };

    const addOption = (qIdx: number) => {
        setQuestions(prev => prev.map((q, i) => i === qIdx ? { ...q, options: [...q.options, ""] } : q));
    };

    const removeOption = (qIdx: number, optIdx: number) => {
        setQuestions(prev => prev.map((q, i) => {
            if (i !== qIdx) return q;
            return { ...q, options: q.options.filter((_, oi) => oi !== optIdx) };
        }));
    };

    const removeQuestion = (idx: number) => {
        setQuestions(prev => prev.filter((_, i) => i !== idx));
    };

    const autoGenerateFromCOs = () => {
        if (cos.length === 0) {
            showToast("No COs defined for this subject. Define them first.", "error");
            return;
        }
        const generated = cos.map(co => ({
            text: `How well did you achieve CO${co.co_number}: "${co.description}"?`,
            co_id: co.id,
            options: ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"],
        }));
        setQuestions(generated);
        setNewTitle(`Course Exit Survey – ${subjects.find(s => s.id === selectedSubject)?.code || ""}`);
        showToast(`Generated ${cos.length} questions from Course Outcomes`, "success");
    };

    const createSurvey = async () => {
        if (!newTitle.trim()) { showToast("Enter a survey title", "error"); return; }
        if (questions.length === 0) { showToast("Add at least one question", "error"); return; }
        if (questions.some(q => !q.text.trim())) { showToast("All questions must have text", "error"); return; }

        setCreating(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Create survey
            const { data: survey, error: surveyError } = await supabase.from("surveys").insert({
                subject_id: selectedSubject,
                survey_type: "STUDENT",
                title: newTitle.trim(),
                academic_year: "2025-26",
                is_active: true,
                created_by: user.id,
            }).select("id").single();

            if (surveyError) throw surveyError;

            // Create questions — store options as JSON in question_text
            const questionRecords = questions.map((q, idx) => ({
                survey_id: survey.id,
                question_number: idx + 1,
                question_text: q.text.trim(),
                co_id: q.co_id || null,
            }));

            const { error: qError } = await supabase.from("survey_questions").insert(questionRecords);
            if (qError) throw qError;

            showToast("Survey created successfully!", "success");
            setShowCreateForm(false);
            setNewTitle("");
            setQuestions([]);
            fetchSurveys();
        } catch (error: any) {
            console.error("Error:", error);
            showToast(error.message || "Failed to create survey", "error");
        } finally { setCreating(false); }
    };

    const toggleSurveyActive = async (surveyId: string, currentlyActive: boolean) => {
        try {
            const { error } = await supabase
                .from("surveys")
                .update({ is_active: !currentlyActive })
                .eq("id", surveyId);
            if (error) throw error;
            showToast(`Survey ${!currentlyActive ? "activated" : "deactivated"}`, "success");
            fetchSurveys();
        } catch (error) { showToast("Failed to update survey", "error"); }
    };

    const deleteSurvey = async (surveyId: string) => {
        if (!confirm("Delete this survey and all its responses?")) return;
        try {
            const { error } = await supabase.from("surveys").delete().eq("id", surveyId);
            if (error) throw error;
            showToast("Survey deleted", "success");
            fetchSurveys();
        } catch (error) { showToast("Failed to delete survey", "error"); }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">📊 Surveys</h1>
                    <p className="text-slate-500">Create surveys for student feedback on Course Outcomes</p>
                </div>
                {selectedSubject && (
                    <Button onClick={() => { setShowCreateForm(!showCreateForm); if (!showCreateForm) setQuestions([]); }}>
                        {showCreateForm ? "Cancel" : "+ New Survey"}
                    </Button>
                )}
            </div>

            {/* Subject Selector */}
            <Card>
                <label className="block text-sm font-medium text-slate-700 mb-1">Select Subject</label>
                <select
                    value={selectedSubject}
                    onChange={e => { setSelectedSubject(e.target.value); setShowCreateForm(false); }}
                    className="w-full max-w-md px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                >
                    <option value="">Choose a subject</option>
                    {subjects.map(s => (
                        <option key={s.id} value={s.id}>{s.code} – {s.name}</option>
                    ))}
                </select>
                {subjects.length === 0 && (
                    <p className="text-sm text-slate-500 mt-2">No subjects assigned. Contact admin.</p>
                )}
            </Card>

            {/* Create Survey Form */}
            {showCreateForm && selectedSubject && (
                <Card>
                    <h3 className="text-lg font-bold text-slate-800 mb-4">Create New Survey</h3>
                    <div className="space-y-4">
                        {/* Title */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Survey Title</label>
                            <input
                                type="text"
                                value={newTitle}
                                onChange={e => setNewTitle(e.target.value)}
                                placeholder="e.g., Course Exit Survey – CS301"
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>

                        {/* Auto-generate button */}
                        <div className="flex gap-2">
                            <Button variant="secondary" onClick={autoGenerateFromCOs}>
                                ⚡ Auto-Generate from COs
                            </Button>
                            <Button variant="outline" onClick={addQuestion}>
                                + Add Custom Question
                            </Button>
                        </div>

                        {/* Questions */}
                        {questions.length > 0 && (
                            <div className="space-y-4">
                                <h4 className="text-sm font-semibold text-slate-600 uppercase tracking-wider">Questions ({questions.length})</h4>
                                {questions.map((q, qIdx) => (
                                    <div key={qIdx} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-bold text-slate-700">Q{qIdx + 1}</span>
                                            <button onClick={() => removeQuestion(qIdx)} className="text-red-500 hover:text-red-700 text-sm font-medium">Remove</button>
                                        </div>

                                        {/* Question text */}
                                        <textarea
                                            value={q.text}
                                            onChange={e => updateQuestion(qIdx, "text", e.target.value)}
                                            placeholder="Enter question text..."
                                            rows={2}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                                        />

                                        {/* Link to CO */}
                                        <div className="flex gap-3 items-center">
                                            <label className="text-xs font-medium text-slate-600 flex-shrink-0">Linked CO:</label>
                                            <select
                                                value={q.co_id}
                                                onChange={e => updateQuestion(qIdx, "co_id", e.target.value)}
                                                className="flex-1 px-2 py-1 border border-slate-300 rounded-lg text-sm"
                                            >
                                                <option value="">None</option>
                                                {cos.map(co => (
                                                    <option key={co.id} value={co.id}>CO{co.co_number} – {co.description.substring(0, 50)}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* MCQ Options */}
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <label className="text-xs font-medium text-slate-600">Answer Options (MCQ)</label>
                                                <button onClick={() => addOption(qIdx)} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">+ Add Option</button>
                                            </div>
                                            <div className="space-y-2">
                                                {q.options.map((opt, optIdx) => (
                                                    <div key={optIdx} className="flex items-center gap-2">
                                                        <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                                                            {optIdx + 1}
                                                        </span>
                                                        <input
                                                            type="text"
                                                            value={opt}
                                                            onChange={e => updateOption(qIdx, optIdx, e.target.value)}
                                                            placeholder={`Option ${optIdx + 1}`}
                                                            className="flex-1 px-2 py-1 border border-slate-300 rounded-lg text-sm"
                                                        />
                                                        {q.options.length > 2 && (
                                                            <button onClick={() => removeOption(qIdx, optIdx)} className="text-red-400 hover:text-red-600 text-sm">✕</button>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                <div className="flex justify-end pt-2">
                                    <Button onClick={createSurvey} disabled={creating}>
                                        {creating ? "Creating..." : "📋 Create Survey"}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </Card>
            )}

            {/* Existing Surveys List */}
            {selectedSubject && !showCreateForm && (
                surveys.length === 0 ? (
                    <Card>
                        <div className="text-center py-12 text-slate-500">
                            <svg className="w-16 h-16 mx-auto mb-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                            </svg>
                            <p className="text-lg font-medium">No surveys yet</p>
                            <p className="text-sm">Create a survey to collect student feedback on COs.</p>
                        </div>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {surveys.map(survey => (
                            <Card key={survey.id} className="hover:shadow-lg transition-shadow">
                                <div className="flex items-start justify-between mb-3">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="text-lg font-bold text-slate-800">{survey.title}</h3>
                                            <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${survey.is_active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                                                {survey.is_active ? "Active" : "Inactive"}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-500">
                                            {survey.survey_questions?.length || 0} questions • {survey.response_count || 0} responses •
                                            Created {new Date(survey.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => toggleSurveyActive(survey.id, survey.is_active)}
                                            className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${survey.is_active ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200" : "bg-green-100 text-green-700 hover:bg-green-200"}`}
                                        >
                                            {survey.is_active ? "Deactivate" : "Activate"}
                                        </button>
                                        <button
                                            onClick={() => deleteSurvey(survey.id)}
                                            className="px-3 py-1 text-xs font-medium rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>

                                {/* Questions preview */}
                                <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                                    {survey.survey_questions
                                        ?.sort((a, b) => a.question_number - b.question_number)
                                        .map(q => (
                                            <div key={q.id} className="flex items-start gap-3 text-sm">
                                                <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                                                    {q.question_number}
                                                </span>
                                                <div className="flex-1">
                                                    <p className="text-slate-700">{q.question_text}</p>
                                                    {q.course_outcomes && (
                                                        <span className="text-xs text-emerald-600 font-medium">
                                                            → CO{q.course_outcomes.co_number}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            </Card>
                        ))}
                    </div>
                )
            )}
        </div>
    );
}
