import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
    try {
        // Test connection using environment variables
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        console.log('Testing Supabase connection...');
        console.log('URL:', supabaseUrl);
        console.log('Key exists:', !!supabaseAnonKey);

        if (!supabaseUrl || !supabaseAnonKey) {
            return NextResponse.json({
                success: false,
                error: 'Missing Supabase credentials',
                url: supabaseUrl,
                keyExists: !!supabaseAnonKey
            }, { status: 500 });
        }

        // Create client
        const supabase = createClient(supabaseUrl, supabaseAnonKey);

        // Test 1: Simple query
        const { data: departments, error: deptError } = await supabase
            .from('departments')
            .select('*')
            .limit(10);

        console.log('Departments query result:', { departments, error: deptError });

        // Test 2: Count query
        const { count, error: countError } = await supabase
            .from('departments')
            .select('*', { count: 'exact', head: true });

        console.log('Count result:', { count, error: countError });

        return NextResponse.json({
            success: true,
            tests: {
                credentials: {
                    urlExists: !!supabaseUrl,
                    keyExists: !!supabaseAnonKey,
                    url: supabaseUrl
                },
                departmentsQuery: {
                    data: departments,
                    error: deptError,
                    count: departments?.length || 0
                },
                countQuery: {
                    count,
                    error: countError
                }
            }
        });

    } catch (error: any) {
        console.error('Connection test error:', error);
        return NextResponse.json({
            success: false,
            error: error.message,
            details: error
        }, { status: 500 });
    }
}
