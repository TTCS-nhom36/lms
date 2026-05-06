/**
 * Utility functions for formatting and processing gradebook data
 */

export const formatScore = (score) => {
  if (score == null || score === undefined) return '—';
  const numScore = Number(score);
  return isNaN(numScore) ? '—' : numScore.toFixed(1);
};

export const getScoreColor = (score) => {
  if (score == null || score === undefined) return 'text-gray-500';
  const numScore = Number(score);
  if (numScore >= 8) return 'text-emerald-600';
  if (numScore >= 6) return 'text-amber-600';
  if (numScore >= 4) return 'text-orange-600';
  return 'text-red-600';
};

export const getScoreBgColor = (score) => {
  if (score == null || score === undefined) return 'bg-gray-50';
  const numScore = Number(score);
  if (numScore >= 8) return 'bg-emerald-50';
  if (numScore >= 6) return 'bg-amber-50';
  if (numScore >= 4) return 'bg-orange-50';
  return 'bg-red-50';
};

export const calculateCompletionRate = (submitted, total) => {
  if (total === 0) return 0;
  return Math.round((submitted / total) * 100);
};

export const getCompletionStatus = (submitted, total) => {
  if (total === 0) return { text: 'No assignments', color: 'text-gray-500' };
  const rate = calculateCompletionRate(submitted, total);
  if (rate === 100) return { text: 'Complete', color: 'text-emerald-600' };
  if (rate >= 75) return { text: 'In Progress', color: 'text-blue-600' };
  if (rate >= 25) return { text: 'In Progress', color: 'text-amber-600' };
  return { text: 'Not Started', color: 'text-red-600' };
};

export const sortGradebook = (entries, sortBy = 'name', sortOrder = 'asc') => {
  const sorted = [...entries];
  
  sorted.sort((a, b) => {
    let aVal, bVal;
    
    switch (sortBy) {
      case 'name':
        aVal = (a.fullName || '').toLowerCase();
        bVal = (b.fullName || '').toLowerCase();
        break;
      case 'email':
        aVal = (a.email || '').toLowerCase();
        bVal = (b.email || '').toLowerCase();
        break;
      case 'submitted':
        aVal = a.submittedAssignments || 0;
        bVal = b.submittedAssignments || 0;
        break;
      case 'score':
        aVal = Number(a.averageScore || 0);
        bVal = Number(b.averageScore || 0);
        break;
      case 'completion':
        aVal = a.totalAssignments > 0 ? a.submittedAssignments / a.totalAssignments : 0;
        bVal = b.totalAssignments > 0 ? b.submittedAssignments / b.totalAssignments : 0;
        break;
      default:
        return 0;
    }
    
    if (sortOrder === 'asc') {
      return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    } else {
      return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
    }
  });
  
  return sorted;
};

export const filterGradebook = (entries, searchTerm) => {
  if (!searchTerm.trim()) return entries;
  
  const term = searchTerm.toLowerCase();
  return entries.filter(entry =>
    entry.fullName?.toLowerCase().includes(term) ||
    entry.email?.toLowerCase().includes(term)
  );
};
