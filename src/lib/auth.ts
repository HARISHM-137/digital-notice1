import { supabase } from './supabaseClient';

export interface AuthUser {
    id: string;
    email: string;
    name: string;
    role: 'ADMIN' | 'FACULTY' | 'STUDENT';
    department_id?: string;
    year?: number;
}

/**
 * Get the currently authenticated user with their profile from public.users.
 * Returns null if not authenticated.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return null;

        const { data, error } = await supabase
            .from('users')
            .select('id, email, name, role, department_id, year')
            .eq('id', session.user.id)
            .single();

        if (error || !data) return null;

        return data as AuthUser;
    } catch {
        return null;
    }
}

/**
 * Check if a role is allowed to access a given path prefix.
 */
export function isRoleAllowed(role: string, pathPrefix: string): boolean {
    const roleRoutes: Record<string, string> = {
        ADMIN: '/admin',
        FACULTY: '/faculty',
        STUDENT: '/student',
    };
    return roleRoutes[role] === pathPrefix;
}

/**
 * Get the dashboard path for a given role.
 */
export function getDashboardPath(role: string): string {
    const roleRoutes: Record<string, string> = {
        ADMIN: '/admin',
        FACULTY: '/faculty',
        STUDENT: '/student',
    };
    return roleRoutes[role] || '/login';
}
