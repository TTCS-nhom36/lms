import { ChevronDown, ChevronUp } from 'lucide-react';
import StatusBadge from '../ui/StatusBadge';

const formatScore = (score) => {
  if (score == null) return '-';
  const numScore = Number(score);
  return Number.isNaN(numScore) ? '-' : numScore.toFixed(1);
};

const getScoreColor = (score) => {
  if (score == null) return 'text-gray-500';
  const numScore = Number(score);
  if (numScore >= 8) return 'text-emerald-600';
  if (numScore >= 5) return 'text-amber-600';
  return 'text-red-500';
};

function SortHeader({ field, sortBy, sortOrder, onSort, children }) {
  return (
    <button onClick={() => onSort(field)} className="flex items-center gap-1 hover:text-blue-600 transition-colors">
      <span className="text-xs font-semibold text-gray-700">{children}</span>
      {sortBy === field && (sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
    </button>
  );
}

export default function GradebookTable({ entries, sortBy, sortOrder, onSort, onOpenStudent }) {
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left"><SortHeader field="name" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort}>Student</SortHeader></th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Email</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Status</th>
              <th className="px-6 py-3 text-left"><SortHeader field="submitted" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort}>Submitted</SortHeader></th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Total</th>
              <th className="px-6 py-3 text-left"><SortHeader field="score" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort}>Avg Score</SortHeader></th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {entries.map((entry) => (
              <tr key={entry.userId} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 font-medium text-gray-800 text-sm">{entry.fullName}</td>
                <td className="px-6 py-4 text-gray-600 text-sm">{entry.email}</td>
                <td className="px-6 py-4"><StatusBadge status={entry.enrollmentStatus} size="xs" /></td>
                <td className="px-6 py-4 text-gray-700 text-sm font-medium">{entry.submittedAssignments}</td>
                <td className="px-6 py-4 text-gray-700 text-sm">{entry.totalAssignments}</td>
                <td className="px-6 py-4"><span className={`font-semibold text-sm ${getScoreColor(entry.averageScore)}`}>{formatScore(entry.averageScore)}</span></td>
                <td className="px-6 py-4">
                  <button onClick={() => onOpenStudent(entry)} className="text-blue-600 hover:text-blue-700 text-xs font-medium hover:underline">
                    View Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {entries.length === 0 && (
          <div className="px-6 py-8 text-center">
            <p className="text-gray-500 text-sm">No students found matching your search.</p>
          </div>
        )}
      </div>
    </div>
  );
}
