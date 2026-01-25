# Course Context Migration Guide

## Summary of Changes

This guide outlines the minimal changes needed to migrate from plain `subject` strings to structured `course` contexts across the professor portal.

## Key Helper Functions (courseHelpers.js)

```javascript
import { courseKey, courseLabel, courseSubtitle, legacySubjectToCourse } from '../utils/courseHelpers';
```

- `courseKey(course)` → Unique composite key: `${degree}|${year}|${sem}|${subjectName}`
- `courseLabel(course)` → Display name (subject name)
- `courseSubtitle(course)` → Context display (BTech • Year 3 • Sem I)
- `legacySubjectToCourse(subj)` → Convert old string to course object

## File-by-File Changes

### 1. ProfProfilePage.js
**Current:** `profile.subjects` as string array
**Change to:** `profile.courses` as course object array

```javascript
// Replace profile state:
const [profile, setProfile] = React.useState({
  // ... existing fields ...
  courses: [] // Replace 'subjects'
});

// Replace in fetch & save:
// courses: Array.isArray(prof.courses) ? prof.courses : 
//          (prof.subjects ? prof.subjects.map(legacySubjectToCourse) : [])
```

**UI Changes:**
- Replace subject input with "Add Course" form:
  - Degree dropdown (BTech/MTech/MCA)
  - Year dropdown (dynamic: 1-4 for BTech, 1-2 for MTech)
  - Semester dropdown (I-VIII for BTech, I-IV for MTech)
  - Subject Name input
  - Regulation field (DISABLED, read-only, future use)
- Update chips to show: `Subject Name` + `Degree • Year • Sem` subtitle
- Keep all styling identical

### 2. ProfPermissions.js
**Current:** Only subject in AddPermissionModal
**Changes:**
- AddPermissionModal already has `degree` state (unused) → NOW SEND IT
- Add `year` and `semester` dropdowns
- Show Regulation field (DISABLED)
- Send payload: `{ degree, year, sem, subjectName, date, startTime, endTime }`
- PermissionCard display: `Subject Name` + subtitle `Degree • Year • Sem`

**Code Changes:**
```javascript
// In AddPermissionModal handleSubmit:
const body = {
  degree: degree,           // NOW INCLUDED
  year: year,               // NEW
  sem: semester,            // NEW
  subject_name: subjectName, // NEW field name
  date: date,
  start_time: startTime,
  end_time: endTime,
  // ... other fields
};

// In PermissionCard rendering:
<div>{courseLabel(permission)}</div>  {/* Subject Name */}
<div className="text-gray-400 text-sm">{courseSubtitle(permission)}</div>  {/* Context */}
```

### 3. ReviewAttendance.js
**Current:** Subject filter built from card.subject only
**Changes:**
- Build subject options using composite key: `${subj}|${prog}|${year}|${sem}`
- Update filter logic to match composite key
- Card display: `Subject Name` + `Degree • Year • Sem` subtitle

```javascript
// Replace subjectOptions useMemo:
const subjectOptions = useMemo(() => {
  const uniques = new Set();
  cards.forEach((c) => {
    if (c.subject) {
      // Use composite key for uniqueness
      const key = `${c.subject}|${c.program}|${c.year}|${c.sem_roman}`;
      uniques.add(key);
    }
  });
  return ['All Subjects', ...Array.from(uniques)];
}, [cards]);

// Update filtering:
const filtered = useMemo(() => {
  return cards.filter((card) => {
    const cardKey = `${card.subject}|${card.program}|${card.year}|${card.sem_roman}`;
    const matchesSubject = subject === 'All Subjects' || cardKey === subject;
    // ... rest of filters
  });
}, [search, subject, status, cards]);
```

### 4. ProfLMSFiles.js
**Current:** Subject selection and file grouping by subject only
**Changes:**
- Update upload form Subject dropdown to select full course
- Show Regulation field (DISABLED)
- Group files using: `${degree}|${year}|${sem}|${subjectName}`
- Display cards: `Subject Name` + subtitle

```javascript
// In upload form state:
const [uploadForm, setUploadForm] = React.useState({
  title: '',
  degree: '',     // NEW
  year: '',       // NEW
  semester: '',   // NEW
  subjectName: '', // NEW (rename from 'subject')
  regulation: '', // NEW (DISABLED)
  fileType: '',
  file: null,
  isPublic: true,
});

// Grouping logic:
const compositeKey = `${uploadForm.degree}|${uploadForm.year}|${uploadForm.semester}|${uploadForm.subjectName}`;
setFilesBySubject(prev => ({
  ...prev,
  [compositeKey]: prev[compositeKey] ? [...prev[compositeKey], fileObj] : [fileObj]
}));
```

## Migration Checklist

- [ ] Add `import { courseKey, courseLabel, courseSubtitle, legacySubjectToCourse } from '../utils/courseHelpers';` to all 4 files
- [ ] ProfProfilePage.js: Replace `subjects` with `courses` (state + fetch + save)
- [ ] ProfProfilePage.js: Update subject input UI to course form (no styling changes)
- [ ] ProfProfilePage.js: Update chips to show subtitle
- [ ] ProfPermissions.js: Add `year` and `sem` to modal
- [ ] ProfPermissions.js: Send `degree` in payload
- [ ] ProfPermissions.js: Update PermissionCard display
- [ ] ReviewAttendance.js: Update subject filter logic to use composite key
- [ ] ReviewAttendance.js: Update card subtitle display
- [ ] ProfLMSFiles.js: Add degree/year/sem to upload form
- [ ] ProfLMSFiles.js: Update file grouping key
- [ ] ProfLMSFiles.js: Update material card display
- [ ] Backend: Accept new payload format (degree, year, sem, subject_name)
- [ ] Backend: Return courses in responses (with backward compat for legacy subjects)

## Backward Compatibility

If backend returns `subjects` (old format) instead of `courses`, auto-convert:
```javascript
const courses = prof.courses || (prof.subjects ? prof.subjects.map(legacySubjectToCourse) : []);
```

This marks converted courses with `needsDetails: true` for future UI indicator if needed.

## UI Styling Rule

✅ **ALLOWED:**
- Add new form fields (degree, year, semester dropdowns)
- Add helper text or small labels
- Change component state and logic
- Update rendering output

❌ **FORBIDDEN:**
- Modify Tailwind classes
- Change colors, spacing, fonts
- Refactor component structure
- Rename CSS classes
- Move UI elements around

---

**Implementation Focus:** Minimal code changes with ZERO visual redesign.
