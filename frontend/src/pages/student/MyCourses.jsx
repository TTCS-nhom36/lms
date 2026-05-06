import { useState, useEffect } from 'react';
import { courseApi } from '../../api/courseApi';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import EmptyState from '../../components/ui/EmptyState';
import { BookMarked, BookOpen, ArrowRight } from 'lucide-react';

export default function MyCourses() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const res = await courseApi.getMyCourses();
      setCourses(res.data || []);
    } catch { console.error('Failed to load'); }
    finally { setLoading(false); }
  };

  if (loading) return <LoadingSpinner text="Loading courses..." />;

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h2 className="text-lg font-bold text-gray-900">My Courses</h2>
        <p className="text-xs text-gray-500 mt-0.5">{courses.length} enrolled courses</p>
      </div>

      {courses.length === 0 ? (
        <EmptyState icon={BookMarked} title="No enrolled courses" description="Browse courses and enroll to start learning" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((c, i) => (
            <div
              key={c.id}
              onClick={() => navigate(`/student/courses/${c.id}`)}
              className="card overflow-hidden cursor-pointer group animate-slide-up hover:shadow-md transition-shadow"
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
                    ✓ Hoàn thành
                  </div>
                )}
              </div>
              <div className="p-4">
                <h4 className="font-semibold text-gray-900 text-sm truncate mb-1">{c.title}</h4>
                <p className="text-xs text-gray-400 line-clamp-2 mb-3">{c.description || 'No description'}</p>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1">
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${c.progressPercent || 0}%` }} />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {(c.progressPercent || 0) >= 100
                        ? '✓ Đã hoàn thành'
                        : c.progressPercent
                        ? `${c.progressPercent}% hoàn thành`
                        : 'Chưa bắt đầu'}
                    </p>
                  </div>
                  <ArrowRight size={14} className="text-gray-300 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
