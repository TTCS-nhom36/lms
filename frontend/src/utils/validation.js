export function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

export function validateUserForm(form, { editing = false } = {}) {
  const errors = {};
  if (!form.email?.trim()) errors.email = 'Email is required';
  else if (!isEmail(form.email)) errors.email = 'Enter a valid email address';
  if (!form.fullName?.trim()) errors.fullName = 'Full name is required';
  if (!editing && !form.passwordHash) errors.passwordHash = 'Password is required';
  if (form.passwordHash && form.passwordHash.length < 6) errors.passwordHash = 'Password must be at least 6 characters';
  return errors;
}

export function validateCourseForm(form) {
  const errors = {};
  if (!form.title?.trim()) errors.title = 'Course title is required';
  if (form.thumbnailUrl?.trim()) {
    try {
      new URL(form.thumbnailUrl);
    } catch {
      errors.thumbnailUrl = 'Enter a valid thumbnail URL';
    }
  }
  return errors;
}

export function validateAssignmentForm(form) {
  const errors = {};
  if (!form.title?.trim()) errors.title = 'Assignment title is required';
  if (Number(form.maxScore) <= 0) errors.maxScore = 'Max score must be greater than 0';
  if (Number(form.weight) <= 0) errors.weight = 'Weight must be greater than 0';
  if (Number(form.timeLimitMins) < 0) errors.timeLimitMins = 'Time limit cannot be negative';
  return errors;
}

export function firstError(errors) {
  return Object.values(errors)[0] || '';
}
