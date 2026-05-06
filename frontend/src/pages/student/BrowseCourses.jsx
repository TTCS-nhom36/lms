import { useState, useEffect } from 'react';
import { courseApi } from '../../api/courseApi';
import { useToast } from '../../contexts/ToastContext';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import EmptyState from '../../components/ui/EmptyState';
import Pagination from '../../components/ui/Pagination';
import { Search, BookOpen, UserPlus, Sparkles } from 'lucide-react';

export default function BrowseCourses() {
  const toast = useToast();
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [enrolling, setEnrolling] = useState(null);

  useEffect(() => { loadCourses(); }, [page, search]);

  const loadCourses = async () => {
    try {
      const params = { page, size: 12, status: 'PUBLISHED' };
      if (search) params.search = search;
      const res = await courseApi.getAll(params);
      setCourses(res.data.items || []);
      setTotalPages(res.data.totalPages || 0);
    } catch { toast.error('Failed to load courses'); }
    finally { setLoading(false); }
  };

  const handleEnroll = async (courseId) => {
    setEnrolling(courseId);
    try {
      await courseApi.enroll(courseId);
      toast.success('Enrolled successfully! 🎉');
      navigate(`/student/courses/${courseId}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to enroll');
    } finally { setEnrolling(null); }
  };

  if (loading) return <LoadingSpinner text="Loading courses..." />;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="card p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
          <Sparkles size={18} className="text-red-400" />
          Explore Courses
        </h2>
        <p className="text-sm text-gray-500 mb-4">Find the perfect course to accelerate your learning journey</p>
        <div className="relative max-w-md">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by course title..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="!pl-9 !text-[13px]"
          />
        </div>
      </div>

      {/* Grid */}
      {courses.length === 0 ? (
        <EmptyState icon={BookOpen} title="No courses available" description="Check back later for new courses" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {courses.map((c, i) => (
            <div key={c.id} className="card overflow-hidden group animate-slide-up" style={{ opacity: 0, animationDelay: `${i * 0.04}s` }}>
              <div className="h-32 bg-gradient-to-br from-violet-50 to-indigo-100 flex items-center justify-center relative overflow-hidden">
                {c.thumbnailUrl ? (
                  <img src={c.thumbnailUrl} alt={c.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <BookOpen size={30} className="text-indigo-300" />
                )}
              </div>
              <div className="p-4">
                <h4 className="font-semibold text-gray-900 text-sm truncate mb-1">{c.title}</h4>
                <p className="text-xs text-gray-400 line-clamp-2 mb-3">{c.description || 'No description'}</p>
                <button
                  onClick={() => handleEnroll(c.id)}
                  disabled={enrolling === c.id}
                  className="w-full py-2 rounded-lg text-[13px] font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  <UserPlus size={13} />
                  {enrolling === c.id ? 'Enrolling...' : 'Enroll Now'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
