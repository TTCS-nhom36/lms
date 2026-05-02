import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { courseApi } from '../../api/courseApi';
import { useToast } from '../../contexts/ToastContext';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import StatusBadge from '../../components/ui/StatusBadge';
import Modal from '../../components/ui/Modal';
import { ArrowLeft, Download, FileSpreadsheet, Search, ChevronUp, ChevronDown } from 'lucide-react';

const formatScore = (score) => {
  if (score == null) return '—';
  const numScore = Number(score);
  return isNaN(numScore) ? '—' : numScore.toFixed(1);
};

const getScoreColor = (score) => {
  if (score == null) return 'text-gray-500';
  const numScore = Number(score);
  if (numScore >= 8) return 'text-emerald-600';
  if (numScore >= 5) return 'text-amber-600';
  return 'text-red-500';
};

export default function Gradebook() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name'); // name, submitted, score
  const [sortOrder, setSortOrder] = useState('asc'); // asc, desc
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => { loadData(); }, [courseId]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await courseApi.getGradebook(courseId);
      setData(res.data);
    } catch (err) {
      setError('Failed to load gradebook. Please try again.');
      toast.error('Failed to load gradebook');
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSortedData = useMemo(() => {
    if (!data?.entries) return [];

    // Filter by search term
    let filtered = data.entries.filter(e =>
      e.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Sort
    filtered.sort((a, b) => {
      let aVal, bVal;
      
      if (sortBy === 'name') {
        aVal = (a.fullName || '').toLowerCase();
        bVal = (b.fullName || '').toLowerCase();
      } else if (sortBy === 'submitted') {
        aVal = a.submittedAssignments || 0;
        bVal = b.submittedAssignments || 0;
      } else if (sortBy === 'score') {
        aVal = Number(a.averageScore || 0);
        bVal = Number(b.averageScore || 0);
      }

      if (sortOrder === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
    });

    return filtered;
  }, [data, searchTerm, sortBy, sortOrder]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await courseApi.exportGradebook(courseId);
      // res.data is already a Blob
      const url = window.URL.createObjectURL(res.data);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `gradebook-course-${courseId}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Gradebook exported successfully');
    } catch (err) {
      toast.error('Failed to export gradebook');
    } finally {
      setExporting(false);
    }
  };

  const handleSort = (newSortBy) => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('asc');
    }
  };

  const openStudentDetail = (student) => {
    setSelectedStudent(student);
    setShowDetail(true);
  };

  if (loading) return <LoadingSpinner text="Loading gradebook..." />;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-gray-900">Gradebook</h2>
          <p className="text-xs text-gray-500">{data?.courseTitle} • {data?.entries?.length || 0} students</p>
        </div>
        <button 
          onClick={handleExport} 
          disabled={exporting || !data?.entries?.length}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download size={14} /> {exporting ? 'Exporting...' : 'Export Excel'}
        </button>
      </div>

      {error && (
        <div className="card bg-red-50 border border-red-200 p-4 rounded-lg">
          <p className="text-red-700 text-sm font-medium">{error}</p>
          <button onClick={loadData} className="text-red-600 text-xs hover:underline mt-2">
            Try again
          </button>
        </div>
      )}

      {!data?.entries?.length ? (
        <div className="card p-12 text-center">
          <FileSpreadsheet size={36} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No gradebook data available</p>
        </div>
      ) : (
        <>
          <div className="card p-4 border border-gray-200">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <button 
                        onClick={() => handleSort('name')}
                        className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                      >
                        <span className="text-xs font-semibold text-gray-700">Student</span>
                        {sortBy === 'name' && (
                          sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                        )}
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Status</th>
                    <th className="px-6 py-3 text-left">
                      <button 
                        onClick={() => handleSort('submitted')}
                        className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                      >
                        <span className="text-xs font-semibold text-gray-700">Submitted</span>
                        {sortBy === 'submitted' && (
                          sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                        )}
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Total</th>
                    <th className="px-6 py-3 text-left">
                      <button 
                        onClick={() => handleSort('score')}
                        className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                      >
                        <span className="text-xs font-semibold text-gray-700">Avg Score</span>
                        {sortBy === 'score' && (
                          sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                        )}
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredAndSortedData.map((e) => (
                    <tr key={e.userId} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-800 text-sm">{e.fullName}</td>
                      <td className="px-6 py-4 text-gray-600 text-sm">{e.email}</td>
                      <td className="px-6 py-4"><StatusBadge status={e.enrollmentStatus} size="xs" /></td>
                      <td className="px-6 py-4 text-gray-700 text-sm font-medium">{e.submittedAssignments}</td>
                      <td className="px-6 py-4 text-gray-700 text-sm">{e.totalAssignments}</td>
                      <td className="px-6 py-4">
                        <span className={`font-semibold text-sm ${getScoreColor(e.averageScore)}`}>
                          {formatScore(e.averageScore)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button 
                          onClick={() => openStudentDetail(e)}
                          className="text-blue-600 hover:text-blue-700 text-xs font-medium hover:underline"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredAndSortedData.length === 0 && (
                <div className="px-6 py-8 text-center">
                  <p className="text-gray-500 text-sm">No students found matching your search.</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Student Detail Modal */}
      <Modal isOpen={showDetail} onClose={() => setShowDetail(false)} title="Student Details" size="md">
        {selectedStudent && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Full Name</p>
                <p className="font-semibold text-gray-900">{selectedStudent.fullName}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Email</p>
                <p className="font-semibold text-gray-900">{selectedStudent.email}</p>
              </div>
            </div>

            <div className="border-t pt-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Status</p>
                <div className="mt-1">
                  <StatusBadge status={selectedStudent.enrollmentStatus} size="xs" />
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Enrollment Status</p>
                <p className="font-semibold text-gray-900">{selectedStudent.enrollmentStatus}</p>
              </div>
            </div>

            <div className="border-t pt-4 grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Submitted</p>
                <p className="text-2xl font-bold text-blue-600">{selectedStudent.submittedAssignments}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Total</p>
                <p className="text-2xl font-bold text-gray-700">{selectedStudent.totalAssignments}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Average Score</p>
                <p className={`text-2xl font-bold ${getScoreColor(selectedStudent.averageScore)}`}>
                  {formatScore(selectedStudent.averageScore)}
                </p>
              </div>
            </div>

            <div className="border-t pt-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Completion Rate</p>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{
                    width: selectedStudent.totalAssignments > 0
                      ? `${(selectedStudent.submittedAssignments / selectedStudent.totalAssignments) * 100}%`
                      : '0%'
                  }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {selectedStudent.totalAssignments > 0
                  ? `${((selectedStudent.submittedAssignments / selectedStudent.totalAssignments) * 100).toFixed(0)}% complete`
                  : 'No assignments'}
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
