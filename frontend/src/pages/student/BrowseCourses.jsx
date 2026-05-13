import { useCallback, useState, useEffect } from 'react';
import { courseApi } from '../../api/courseApi';
import { useToast } from '../../hooks/useToast';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { getApiErrorMessage } from '../../utils/apiError';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import EmptyState from '../../components/ui/EmptyState';
import Pagination from '../../components/ui/Pagination';
import PageHeader from '../../components/ui/PageHeader';
import SearchInput from '../../components/ui/SearchInput';
import CardGrid from '../../components/ui/CardGrid';
import CourseCard from '../../components/course/CourseCard';
import { BookOpen, UserPlus, Sparkles } from 'lucide-react';

export default function BrowseCourses() {
  const toast = useToast();
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [enrolling, setEnrolling] = useState(null);

  const loadCourses = useCallback(async () => {
    try {
      const params = { page, size: 12, status: 'PUBLISHED' };
      if (debouncedSearch) params.search = debouncedSearch;
      const res = await courseApi.getAll(params);
      setCourses(res.data.items || []);
      setTotalPages(res.data.totalPages || 0);
    } catch (error) { toast.error(getApiErrorMessage(error, 'Failed to load courses')); }
    finally { setLoading(false); }
  }, [debouncedSearch, page, toast]);

  useEffect(() => { loadCourses(); }, [loadCourses]);

  const handleEnroll = async (courseId) => {
    setEnrolling(courseId);
    try {
      await courseApi.enroll(courseId);
      toast.success('Enrolled successfully!');
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
        <PageHeader icon={Sparkles} title="Explore Courses" description="Find the perfect course to accelerate your learning journey" className="mb-4" />
        <SearchInput value={search} placeholder="Search by course title..." className="max-w-md" onChange={(e) => { setSearch(e.target.value); setPage(0); }} />
      </div>

      {/* Grid */}
      {courses.length === 0 ? (
        <EmptyState icon={BookOpen} title="No courses available" description="Check back later for new courses" />
      ) : (
        <CardGrid columns="grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {courses.map((c, i) => (
            <CourseCard
              key={c.id}
              course={c}
              index={i}
              tone="violet"
              showStatus={false}
              cta={
                <button
                  onClick={() => handleEnroll(c.id)}
                  disabled={enrolling === c.id}
                  className="w-full py-2 rounded-lg text-[13px] font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  <UserPlus size={13} />
                  {enrolling === c.id ? 'Enrolling...' : 'Enroll Now'}
                </button>
              }
            />
          ))}
        </CardGrid>
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
