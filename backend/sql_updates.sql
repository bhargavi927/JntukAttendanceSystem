-- Add geolocation columns to professor_attendance_permissions
ALTER TABLE professor_attendance_permissions
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION DEFAULT NULL,
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION DEFAULT NULL,
ADD COLUMN IF NOT EXISTS radius_meters INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS location_required BOOLEAN DEFAULT TRUE;

-- Add geolocation columns to attendance_submissions (for auditing)
ALTER TABLE attendance_submissions
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION DEFAULT NULL,
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION DEFAULT NULL;
