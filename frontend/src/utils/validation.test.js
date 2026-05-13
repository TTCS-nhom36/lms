import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isEmail,
  validateAssignmentForm,
  validateCourseForm,
  validateUserForm,
} from './validation.js';

test('validates email format', () => {
  assert.equal(isEmail('student@example.com'), true);
  assert.equal(isEmail('student@example'), false);
});

test('validates user create and edit forms', () => {
  assert.deepEqual(validateUserForm({
    email: '',
    passwordHash: '',
    fullName: '',
  }), {
    email: 'Email is required',
    fullName: 'Full name is required',
    passwordHash: 'Password is required',
  });

  assert.deepEqual(validateUserForm({
    email: 'teacher@example.com',
    passwordHash: '',
    fullName: 'Teacher',
  }, { editing: true }), {});
});

test('validates course form', () => {
  assert.deepEqual(validateCourseForm({ title: '', thumbnailUrl: 'not-a-url' }), {
    title: 'Course title is required',
    thumbnailUrl: 'Enter a valid thumbnail URL',
  });
});

test('validates assignment form', () => {
  assert.deepEqual(validateAssignmentForm({
    title: '',
    maxScore: 0,
    weight: 0,
    timeLimitMins: -1,
  }), {
    title: 'Assignment title is required',
    maxScore: 'Max score must be greater than 0',
    weight: 'Weight must be greater than 0',
    timeLimitMins: 'Time limit cannot be negative',
  });
});
