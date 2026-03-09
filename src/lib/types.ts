// =========================================
// Supabase Database Types
// =========================================

// Core User Types
export interface User {
    id: string;
    name: string;
    email: string;
    role: 'ADMIN' | 'FACULTY' | 'STUDENT';
    department_id?: string;
    year?: number;
    register_no?: string;
    created_at: string;
    department?: Department;
}

export interface Department {
    id: string;
    name: string;
    code: string;
    created_at: string;
}

export interface Program {
    id: string;
    name: string;
    code: string;
    department_id: string;
    created_at: string;
    department?: Department;
}

export interface Subject {
    id: string;
    name: string;
    code: string;
    program_id: string;
    semester: number;
    year: number;
    credits: number;
    created_at: string;
    updated_at?: string;
    updated_by?: string;
    programs?: Program;
}

// Assignment & Enrollment
export interface FacultySubject {
    id: string;
    faculty_id: string;
    subject_id: string;
    academic_year: string;
    faculty?: User;
    subject?: Subject;
}

export interface StudentEnrollment {
    id: string;
    student_id: string;
    subject_id: string;
    academic_year: string;
    student?: User;
    subject?: Subject;
}

// Marks & Assessment
export interface StudentMarks {
    id: string;
    student_id: string;
    subject_id: string;
    internal_marks?: number;
    lab_marks?: number;
    exam_marks?: number;
    total_marks?: number;
    updated_by?: string;
    updated_at: string;
    student?: User;
    subject?: Subject;
}

// Course Outcomes & Program Outcomes
export interface CourseOutcome {
    id: string;
    subject_id: string;
    co_number: number;
    description: string;
    target_attainment: number;
    updated_at?: string;
    updated_by?: string;
}

export interface ProgramOutcome {
    id: string;
    program_id: string;
    po_number: number;
    description: string;
    updated_at?: string;
    updated_by?: string;
}

export interface COPOMapping {
    id: string;
    co_id: string;
    po_id: string;
    correlation_level: 1 | 2 | 3;
    updated_at?: string;
    updated_by?: string;
    course_outcome?: CourseOutcome;
    program_outcome?: ProgramOutcome;
}

// Documents
export interface Document {
    id: string;
    title?: string;
    description?: string;
    file_url: string;
    file_name?: string;
    file_type?: string;
    subject_id?: string;
    uploaded_by?: string;
    visibility?: string;
    created_at: string;
    subject?: Subject;
    uploader?: User;
}

export interface DocumentAccess {
    id: string;
    document_id: string;
    student_id: string;
}

// Notifications (Advanced Targeting)
export type NotificationTargetType =
    | 'ALL_STUDENTS'
    | 'ALL_FACULTY'
    | 'ALL_ADMINS'
    | 'DEPARTMENT'
    | 'YEAR'
    | 'SEMESTER'
    | 'DEPARTMENT_YEAR'
    | 'DEPARTMENT_SEMESTER';

export interface Notification {
    id: string;
    title: string;
    message: string;
    document_url?: string;
    document_name?: string;
    role_target: 'STUDENT' | 'FACULTY' | 'ADMIN' | 'ALL';
    department_target?: string;
    year_target?: number;
    semester_target?: number;
    created_by?: string;
    created_at: string;
    creator?: User;
    department?: Department;
}

export interface UserNotification {
    id: string;
    user_id: string;
    notification_id: string;
    is_read: boolean;
    read_at?: string;
    notification?: Notification;
}

// =========================================
// Form Types
// =========================================

export interface UserFormData {
    name: string;
    email: string;
    role: 'ADMIN' | 'FACULTY' | 'STUDENT';
    department_id?: string;
    year?: number;
}

export interface DepartmentFormData {
    name: string;
    code: string;
}

export interface ProgramFormData {
    name: string;
    code: string;
    department_id: string;
}

export interface SubjectFormData {
    name: string;
    code: string;
    program_id: string;
    semester: number;
    year: number;
    credits: number;
}

export interface MarksFormData {
    internal_marks?: number;
    lab_marks?: number;
    exam_marks?: number;
}

export interface DocumentFormData {
    title: string;
    description?: string;
    subject_id?: string;
    visibility: string;
    student_ids?: string[];
}

export interface NotificationFormData {
    title: string;
    message: string;
    target_type: NotificationTargetType;
    department_id?: string;
    year?: number;
    semester?: number;
}

export interface CourseOutcomeFormData {
    co_number: number;
    description: string;
    target_attainment: number;
}

export interface COPOMappingFormData {
    co_id: string;
    po_id: string;
    correlation_level: 1 | 2 | 3;
}

// =========================================
// Assessment & Attainment Types
// =========================================

export interface Assessment {
    id: string;
    subject_id: string;
    name: string;
    type: 'INTERNAL' | 'ASSIGNMENT' | 'LAB' | 'END_SEMESTER';
    max_marks: number;
    academic_year: string;
    created_by?: string;
    created_at: string;
    updated_at?: string;
    subject?: Subject;
}

export interface AssessmentScore {
    id: string;
    assessment_id: string;
    student_id: string;
    co_id?: string;
    marks_obtained: number;
    created_at: string;
    updated_at?: string;
    student?: User;
    assessment?: Assessment;
    course_outcome?: CourseOutcome;
}

export interface AttainmentConfig {
    id: string;
    subject_id: string;
    direct_weight: number;
    indirect_weight: number;
    target_percentage: number;
    academic_year: string;
    created_at: string;
    updated_at?: string;
    subject?: Subject;
}

export interface AttainmentResult {
    id: string;
    subject_id: string;
    co_id?: string;
    po_id?: string;
    result_type: 'CO' | 'PO';
    direct_attainment: number;
    indirect_attainment: number;
    final_attainment: number;
    academic_year: string;
    calculated_at: string;
    subject?: Subject;
    course_outcome?: CourseOutcome;
    program_outcome?: ProgramOutcome;
}

// =========================================
// Survey & Indirect Assessment Types
// =========================================

export interface AppSetting {
    id: string;
    key: string;
    value: string;
    description?: string;
}

export interface ProgramSpecificOutcome {
    id: string;
    program_id: string;
    pso_number: number;
    description: string;
}

export interface COPSOMapping {
    id: string;
    co_id: string;
    pso_id: string;
    correlation_level: 1 | 2 | 3;
}

export interface Survey {
    id: string;
    title: string;
    description?: string;
    subject_id: string;
    created_by: string;
    is_active: boolean;
    created_at: string;
    subject?: Subject;
}

export interface SurveyQuestion {
    id: string;
    survey_id: string;
    question_text: string;
    type: 'RATING' | 'TEXT';
    linked_co_id?: string;
    order_index: number;
}

export interface SurveyResponse {
    id: string;
    survey_id: string;
    student_id: string;
    question_id: string;
    response_value?: number;
    response_text?: string;
}
