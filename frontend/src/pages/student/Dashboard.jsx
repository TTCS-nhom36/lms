import { useState, useEffect } from 'react';
import { courseApi } from '../../api/courseApi';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { BookOpen, BookMarked, TrendingUp, Target, Award, ArrowRight } from 'lucide-react';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import EmptyState from '../../components/ui/EmptyState';

export default function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [myCourses, setMyCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [gradebookLoading, setGradebookLoading] = useState(true);
  const [gradebookData, setGradebookData] = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const res = await courseApi.getMyCourses();
      setMyCourses(res.data || []);
      
      // Load gradebook data for performance summary
      if (res.data && res.data.length > 0) {
        try {
          const gradebookRes = await courseApi.getGradebook(res.data[0].id);
          setGradebookData(gradebookRes.data);
        } catch {
          setGradebookData(null);
        }
      }
    } catch { console.error('Failed to load'); }
    finally { 
      setLoading(false);
      setGradebookLoading(false);
    }
  };

  if (loading) return <LoadingSpinner text="Loading dashboard..." />;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome */}
      <div className="card p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-1">
          Hello, <span className="gradient-text">{user?.fullName}</span> 🎓
        </h2>
        <p className="text-sm text-gray-500">Keep up the great work! Here's your learning progress.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Enrolled Courses', value: myCourses.length, icon: BookMarked, bg: 'bg-blue-50', iconColor: 'text-blue-500' },
          { label: 'In Progress', value: myCourses.filter(c => (c.progressPercent || 0) > 0 && (c.progressPercent || 0) < 100).length, icon: TrendingUp, bg: 'bg-amber-50', iconColor: 'text-amber-500' },
          { label: 'Completed', value: myCourses.filter(c => (c.progressPercent || 0) >= 100).length, icon: Target, bg: 'bg-green-50', iconColor: 'text-green-500' },
        ].map((s, i) => (
          <div key={s.label} className="card p-5 animate-slide-up" style={{ opacity: 0, animationDelay: `${i * 0.07}s` }}>
            <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center mb-3`}>
              <s.icon size={18} className={s.iconColor} />
            </div>
            <div className="text-2xl font-bold text-gray-900">{s.value}</div>
            <div className="text-xs text-gray-500">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Performance Summary Card */}
      {myCourses.length > 0 && (
        <div 
          className="card p-6 bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => navigate('/student/performance')}
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Award size={20} className="text-purple-600" />
                <h3 className="text-lg font-semibold text-gray-900">Your Performance</h3>
              </div>
              <p className="text-sm text-gray-600 mb-4">Track your grades and progress across all courses</p>
              <div className="flex items-center gap-2 text-purple-600 font-medium text-sm">
                View detailed analytics <ArrowRight size={16} />
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Courses</p>
              <p className="text-3xl font-bold text-purple-900 mt-1">{myCourses.length}</p>
            </div>
          </div>
        </div>
      )}

      {/* Courses */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-800">My Enrolled Courses</h3>
          <button onClick={() => navigate('/student/browse')} className="btn-primary text-[13px] !py-2">
            Browse More
          </button>
        </div>

        {myCourses.length === 0 ? (
          <EmptyState icon={BookOpen} title="No enrolled courses" description="Browse available courses and start learning today!" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {myCourses.map((c, i) => (
              <div
                key={c.id}
                onClick={() => navigate(`/student/courses/${c.id}`)}
                className="card overflow-hidden cursor-pointer animate-slide-up group hover:shadow-md transition-shadow"
                style={{ opacity: 0, animationDelay: `${i * 0.05}s` }}
              >
                <div className="h-28 bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center relative overflow-hidden">
                  {c.thumbnailUrl ? (
                    <img src={c.thumbnailUrl} alt={c.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <BookOpen size={28} className="text-emerald-300" />
                  )}
                  {(c.progressPercent || 0) >= 100 && (
                    <div className="absolute top-2 right-2 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      ✓ Done
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h4 className="font-semibold text-gray-900 text-sm truncate">{c.title}</h4>
                  <p className="text-xs text-gray-400 mt-1 line-clamp-2">{c.description || 'No description'}</p>
                  <div className="mt-3">
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all"
                        style={{ width: `${c.progressPercent || 0}%` }}
                      />
                    </div>
                    <span className="text-[11px] text-gray-400 mt-1 block">
                      {c.progressPercent ? `${c.progressPercent}% hoàn thành` : 'Chưa bắt đầu'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
