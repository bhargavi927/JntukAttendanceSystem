-- New professor_profiles table
create table if not exists professor_profiles (
  id text primary key,
  email text,
  role text default 'professor',
  first_name text,
  second_name text,
  phone_number text,
  department text,
  faculty_id text,
  domain text,
  subjects text,
  photo_bucket text,
  photo_object_path text,
  photo_url text,
  is_verified boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create or replace function set_professor_profiles_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_professor_profiles_updated_at
before update on professor_profiles
for each row
execute procedure set_professor_profiles_updated_at();

-- New student_profiles table
create table if not exists student_profiles (
  id text primary key,
  email text,
  role text default 'student',
  first_name text,
  second_name text,
  phone_number text,
  degree text,
  discipline text,
  year_from text,
  year_to text,
  father_name text,
  father_phone_number text,
  mother_name text,
  mother_phone_number text,
  aadhaar_number text,
  aadhaar_last4 text,
  blood_group text,
  address text,
  photo_bucket text,
  photo_object_path text,
  photo_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create or replace function set_student_profiles_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_student_profiles_updated_at
before update on student_profiles
for each row
execute procedure set_student_profiles_updated_at();

-- Attendance permissions table
create table if not exists professor_attendance_permissions (
  id uuid primary key default gen_random_uuid(),
  professor_id text not null,
  subject text not null,
  date date not null,
  start_time time not null,
  end_time time not null,
  status text default 'Active',
  location_required boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create or replace function set_prof_att_perm_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_prof_att_perm_updated_at
before update on professor_attendance_permissions
for each row
execute procedure set_prof_att_perm_updated_at();
-- Attendance submissions table
create table if not exists attendance_submissions (
  id uuid primary key default gen_random_uuid(),
  student_id text not null,
  professor_id text not null,
  subject text not null,
  date date not null,
  time text not null,
  photo_bucket text,
  photo_path text,
  status text default 'Pending',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create or replace function set_attendance_submissions_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_attendance_submissions_updated_at
before update on attendance_submissions
for each row
execute procedure set_attendance_submissions_updated_at();