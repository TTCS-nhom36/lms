import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { courseApi } from '../../api/courseApi';
import { useToast } from '../../contexts/ToastContext';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import StatusBadge from '../../components/ui/StatusBadge';
import { ArrowLeft, Download, FileSpreadsheet } from 'lucide-react';

export default function Gradebook() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, [courseId]);

  const loadData = async () => {
    try { const res = await courseApi.getGradebook(courseId); setData(res.data); }
    catch { toast.error('Failed to load gradebook'); }
    finally { setLoading(false); }
  };

  const handleExport = async () => {
    try {
      const res = await courseApi.exportGradebook(courseId);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `gradebook-course-${courseId}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Gradebook exported');
    } catch { toast.error('Failed to export'); }
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
        <button onClick={handleExport} className="btn-primary">
          <Download size={14} /> Export Excel
        </button>
      </div>

      {!data?.entries?.length ? (
        <div className="card p-12 text-center">
          <FileSpreadsheet size={36} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No gradebook data available</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-[700px]">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th>Total Assignments</th>
                  <th>Average Score</th>
                </tr>
              </thead>
              <tbody>
                {data.entries.map((e) => (
                  <tr key={e.userId}>
                    <td className="font-medium text-gray-800 text-[13px]">{e.fullName}</td>
                    <td className="text-[13px]">{e.email}</td>
                    <td><StatusBadge status={e.enrollmentStatus} size="xs" /></td>
                    <td>{e.submittedAssignments}</td>
                    <td>{e.totalAssignments}</td>
                    <td>
                      <span className={`font-semibold ${
                        e.averageScore >= 8 ? 'text-emerald-600' :
                        e.averageScore >= 5 ? 'text-amber-600' :
                        'text-red-500'
                      }`}>
                        {e.averageScore != null ? Number(e.averageScore).toFixed(1) : '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
