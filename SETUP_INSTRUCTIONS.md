# CO-PO Attainment System - Complete Setup Guide

## 📋 Prerequisites

- Supabase account created
- Node.js installed
- Project dependencies installed (`npm install`)

---

## 🚀 Complete Setup Steps

### Step 1: Configure Environment Variables

Make sure your `src/.env.local` file has these variables:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

Get these from your Supabase Dashboard → **Settings** → **API**

---

### Step 2: Upload Database Schema

1. Open **Supabase Dashboard** → **SQL Editor**
2. Click **New Query**
3. Copy all contents from **`CLEAN_SLATE_SCHEMA.sql`**
4. Paste and click **Run**
5. Wait for "Success" message

**⚠️ WARNING**: This will delete all existing data and recreate tables!

---

### Step 3: Insert Sample Data

1. In **Supabase SQL Editor**, create another **New Query**
2. Copy all contents from **`SAMPLE_DATA.sql`**
3. Paste and click **Run**
4. This creates departments, programs, subjects, etc.

---

### Step 4: Create Authentication Users

Run the automated script to create all sample users:

```bash
node create-sample-users.js
```

This will:
- ✅ Create all users in Supabase Authentication
- ✅ Auto-confirm their email addresses
- ✅ Link them to the database records
- ✅ Display progress for each user

**Expected Output:**
```
🚀 Starting to create sample users in Supabase Auth...

✅ ADMIN    | admin@sample.edu          | Created successfully
✅ ADMIN    | principal@sample.edu       | Created successfully
✅ FACULTY  | faculty1@sample.edu        | Created successfully
✅ FACULTY  | faculty2@sample.edu        | Created successfully
...
```

---

### Step 5: Verify Setup

1. Go to **Supabase Dashboard** → **Authentication** → **Users**
2. You should see 11 users listed
3. Go to **Table Editor** → **users**
4. You should see all 11 user records

---

### Step 6: Test Login

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Open http://localhost:3000

3. Try logging in with any sample account:
   - **Admin**: `admin@sample.edu` / `Admin@123`
   - **Faculty**: `faculty1@sample.edu` / `Faculty@123`
   - **Student**: `student1@sample.edu` / `Student@123`

---

## 📝 Sample User Credentials

### Admin Users (2)
| Email | Password | Name |
|-------|----------|------|
| admin@sample.edu | Admin@123 | Dr. Admin Kumar |
| principal@sample.edu | Principal@123 | Dr. Principal Sharma |

### Faculty Users (4)
| Email | Password | Name | Department |
|-------|----------|------|------------|
| faculty1@sample.edu | Faculty@123 | Dr. Rajesh Verma | CS |
| faculty2@sample.edu | Faculty@123 | Dr. Priya Singh | CS |
| faculty3@sample.edu | Faculty@123 | Dr. Amit Patel | ECE |
| hod@sample.edu | Hod@123 | Dr. HOD Rao | CS |

### Student Users (5)
| Email | Password | Name | Register No | Department |
|-------|----------|------|-------------|------------|
| student1@sample.edu | Student@123 | Rahul Sharma | CSE2023001 | CS |
| student2@sample.edu | Student@123 | Priya Gupta | CSE2023002 | CS |
| student3@sample.edu | Student@123 | Amit Kumar | CSE2023003 | CS |
| student4@sample.edu | Student@123 | Sneha Reddy | CSE2023004 | CS |
| student5@sample.edu | Student@123 | Vikram Singh | ECE2023001 | ECE |

---

## 🔧 Troubleshooting

### Error: "Missing Supabase credentials"
- Check that `src/.env.local` exists and has all required variables
- Make sure you're using `SUPABASE_SERVICE_ROLE_KEY` not the anon key

### Error: "User already exists"
- This is normal if you run the script twice
- The script will skip existing users

### Login Error: "no-profile"
- Make sure you ran **Step 4** (create-sample-users.js)
- Verify users exist in Supabase Auth dashboard

### Error: "column does not exist"
- Run **`CLEAN_SLATE_SCHEMA.sql`** first
- Make sure it completed without errors

---

## 🎯 What You Get

After complete setup:
- ✅ 25 database tables with proper relationships
- ✅ 3 departments (CS, ECE, Mechanical)
- ✅ 3 programs (B.Tech for each department)
- ✅ 11 users (2 admin, 4 faculty, 5 students)
- ✅ 5 subjects (DSA, DBMS, OS, Networks, DSP)
- ✅ Faculty-subject assignments
- ✅ Student enrollments
- ✅ Course outcomes for DSA
- ✅ Program outcomes for CSE

---

## 📚 Next Steps

1. **Explore the Admin Dashboard**: Login as admin and explore all features
2. **Add More Data**: Use the admin interface to add more subjects, students, etc.
3. **Test Faculty Features**: Login as faculty and create assignments/tests
4. **Test Student View**: Login as student to see enrolled courses

---

## 🆘 Need Help?

Check these files for reference:
- `SCHEMA_PROBLEM_EXPLANATION.md` - Detailed schema explanation
- `SAMPLE_USER_CREDENTIALS.md` - Complete user list
- `CLEAN_SLATE_SCHEMA.sql` - Database schema
- `SAMPLE_DATA.sql` - Sample data structure
