/**
 * Script to create sample authentication users in Supabase
 * Run this AFTER uploading CLEAN_SLATE_SCHEMA.sql and SAMPLE_DATA.sql
 * 
 * Usage: node create-sample-users.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, 'src', '.env.local') });

// Initialize Supabase Admin Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Error: Missing Supabase credentials in .env.local');
    console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

// Sample users with their UUIDs matching SAMPLE_DATA.sql
const sampleUsers = [
    // ADMIN USERS
    {
        id: 'a1000000-0000-0000-0000-000000000001',
        email: 'admin@sample.edu',
        password: 'Admin@123',
        name: 'Dr. Admin Kumar',
        role: 'ADMIN'
    },
    {
        id: 'a2000000-0000-0000-0000-000000000002',
        email: 'principal@sample.edu',
        password: 'Principal@123',
        name: 'Dr. Principal Sharma',
        role: 'ADMIN'
    },

    // FACULTY USERS
    {
        id: 'f1000000-0000-0000-0000-00000000000f',
        email: 'faculty1@sample.edu',
        password: 'Faculty@123',
        name: 'Dr. Rajesh Verma',
        role: 'FACULTY'
    },
    {
        id: 'f2000000-0000-0000-0000-00000000000f',
        email: 'faculty2@sample.edu',
        password: 'Faculty@123',
        name: 'Dr. Priya Singh',
        role: 'FACULTY'
    },
    {
        id: 'f3000000-0000-0000-0000-00000000000f',
        email: 'faculty3@sample.edu',
        password: 'Faculty@123',
        name: 'Dr. Amit Patel',
        role: 'FACULTY'
    },
    {
        id: 'f4000000-0000-0000-0000-00000000000f',
        email: 'hod@sample.edu',
        password: 'Hod@123',
        name: 'Dr. HOD Rao',
        role: 'FACULTY'
    },

    // STUDENT USERS
    {
        id: '11110000-0000-0000-0000-000000000001',
        email: 'student1@sample.edu',
        password: 'Student@123',
        name: 'Rahul Sharma',
        role: 'STUDENT'
    },
    {
        id: '22220000-0000-0000-0000-000000000002',
        email: 'student2@sample.edu',
        password: 'Student@123',
        name: 'Priya Gupta',
        role: 'STUDENT'
    },
    {
        id: '33330000-0000-0000-0000-000000000003',
        email: 'student3@sample.edu',
        password: 'Student@123',
        name: 'Amit Kumar',
        role: 'STUDENT'
    },
    {
        id: '44440000-0000-0000-0000-000000000004',
        email: 'student4@sample.edu',
        password: 'Student@123',
        name: 'Sneha Reddy',
        role: 'STUDENT'
    },
    {
        id: '55550000-0000-0000-0000-000000000005',
        email: 'student5@sample.edu',
        password: 'Student@123',
        name: 'Vikram Singh',
        role: 'STUDENT'
    }
];

async function createSampleUsers() {
    console.log('🚀 Starting to create sample users in Supabase Auth...\n');

    let successCount = 0;
    let errorCount = 0;

    for (const user of sampleUsers) {
        try {
            // Create user in Supabase Auth with specific UUID
            const { data, error } = await supabase.auth.admin.createUser({
                email: user.email,
                password: user.password,
                email_confirm: true, // Auto-confirm email
                user_metadata: {
                    name: user.name,
                    role: user.role
                }
            });

            if (error) {
                // Check if user already exists
                if (error.message.includes('already registered')) {
                    console.log(`⚠️  ${user.role.padEnd(8)} | ${user.email.padEnd(25)} | Already exists`);
                } else {
                    console.error(`❌ ${user.role.padEnd(8)} | ${user.email.padEnd(25)} | Error: ${error.message}`);
                    errorCount++;
                }
            } else {
                console.log(`✅ ${user.role.padEnd(8)} | ${user.email.padEnd(25)} | Created successfully`);
                successCount++;

                // Update the users table to use the auth user's ID
                const authUserId = data.user.id;

                // Update the database record with the correct auth ID
                const { error: updateError } = await supabase
                    .from('users')
                    .update({ id: authUserId })
                    .eq('email', user.email);

                if (updateError) {
                    console.error(`   ⚠️  Warning: Could not update user ID in database: ${updateError.message}`);
                }
            }
        } catch (err) {
            console.error(`❌ ${user.role.padEnd(8)} | ${user.email.padEnd(25)} | Exception: ${err.message}`);
            errorCount++;
        }
    }

    console.log('\n' + '='.repeat(80));
    console.log(`✅ Successfully created: ${successCount} users`);
    if (errorCount > 0) {
        console.log(`❌ Errors encountered: ${errorCount} users`);
    }
    console.log('='.repeat(80));

    console.log('\n📋 You can now log in with any of these credentials:');
    console.log('   Admin:   admin@sample.edu / Admin@123');
    console.log('   Faculty: faculty1@sample.edu / Faculty@123');
    console.log('   Student: student1@sample.edu / Student@123');
}

// Run the script
createSampleUsers()
    .then(() => {
        console.log('\n✨ Sample user creation complete!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Fatal error:', error);
        process.exit(1);
    });
