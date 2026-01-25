/**
 * Course Context Helpers
 * Utilities for working with structured course contexts instead of plain subject strings
 */

/**
 * Generate a unique key for a course based on its context
 * @param {Object} course - Course object with degree, year, sem, subjectName
 * @returns {string} Unique course key
 */
export const courseKey = (course) => {
  if (!course) return '';
  const deg = course.degree || '';
  const yr = course.year || '';
  const sem = course.sem || '';
  const subj = course.subjectName || '';
  return `${deg}|${yr}|${sem}|${subj}`.toLowerCase();
};

/**
 * Generate a display label for a course
 * @param {Object} course - Course object with subjectName, degree, year, sem
 * @returns {string} Display label
 */
export const courseLabel = (course) => {
  if (!course) return '-';
  return course.subjectName || '-';
};

/**
 * Generate a subtitle for course context (degree • year • semester)
 * @param {Object} course - Course object with degree, year, sem
 * @returns {string} Subtitle
 */
export const courseSubtitle = (course) => {
  if (!course) return '';
  const parts = [];
  if (course.degree) parts.push(course.degree);
  if (course.year) parts.push(`Year ${course.year}`);
  if (course.sem) parts.push(`Sem ${course.sem}`);
  return parts.join(' • ');
};

/**
 * Convert legacy subject string to course object (with missing fields marked)
 * @param {string} subjectName - Legacy subject name
 * @returns {Object} Course object with placeholder values
 */
export const legacySubjectToCourse = (subjectName) => {
  return {
    subjectName: subjectName || '',
    degree: '',
    year: '',
    sem: '',
    regulation: 'LEGACY',
    needsDetails: true // Mark for UI
  };
};

/**
 * Check if two courses are equivalent based on their context
 * @param {Object} course1 - First course object
 * @param {Object} course2 - Second course object
 * @returns {boolean} True if courses have same context
 */
export const courseEquals = (course1, course2) => {
  if (!course1 || !course2) return false;
  return courseKey(course1) === courseKey(course2);
};
