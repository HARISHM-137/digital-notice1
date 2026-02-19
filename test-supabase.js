// Quick test to verify Supabase connection and check if users table exists
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xdvnlkjmadngwgmxtkqf.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhkdm5sa2ptYWRuZ3dnbXh0a3FmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDYzNTkyMywiZXhwIjoyMDg2MjExOTIzfQ.b5XtKtcHjTz3aTxytYn4VqrTO1YCdGOnp3EK3vdIwqU';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function test() {
    console.log('🔍 Testing Supabase connection...\n');

    // Check if users table exists and has data
    const { data: users, error: usersError } = await supabase
        .from('users')
        .select('*')
        .limit(5);

    if (usersError) {
        console.error('❌ Error fetching users:', usersError.message);
        console.log('💡 This probably means you need to run schema_migration.sql in Supabase!\n');
    } else {
        console.log('✅ Users table exists!');
        console.log(`📊 Found ${users?.length || 0} users\n`);

        if (users && users.length > 0) {
            console.log('👥 Existing users:');
            users.forEach(u => {
                console.log(`  - ${u.email} (${u.role}) - ID: ${u.id}`);
            });
            console.log('');
        } else {
            console.log('⚠️  No users found. You need to create an admin user first!\n');
        }
    }

    // Check auth users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
        console.error('❌ Error listing auth users:', authError.message);
    } else {
        console.log(`🔐 Auth users: ${authUsers.users.length}`);
        if (authUsers.users.length > 0) {
            authUsers.users.forEach(u => {
                console.log(`  - ${u.email} (created: ${u.created_at})`);
            });
        }
    }
}

test().catch(console.error);
