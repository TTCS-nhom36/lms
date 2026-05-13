export function normalizeRole(role) {
  return String(role || '').replace(/^ROLE_/i, '').toUpperCase();
}

export function hasRole(role, allowedRoles) {
  const normalizedRole = normalizeRole(role);
  return allowedRoles.map(normalizeRole).includes(normalizedRole);
}
