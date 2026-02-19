-- Add target_attainment column to course_outcomes table
-- Run this in Supabase SQL Editor

ALTER TABLE course_outcomes 
ADD COLUMN IF NOT EXISTS target_attainment DECIMAL(3,2) DEFAULT 0.60;
