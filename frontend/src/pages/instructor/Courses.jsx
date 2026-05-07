import { useEffect, useMemo, useState } from 'react';
import { courseApi } from '../../api/courseApi';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Plus, TrendingUp, ClipboardList, Trash2 } from 'lucide-react';
import StatusBadge from '../../components/ui/StatusBadge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { useToast } from '../../contexts/ToastContext';

function SummaryCard({ icon: Icon, label, value, hint, accent = 'bg-slate-50 text-slate-700' }) {
  return (
    <div className="card p-5 border border-gray-200 bg-white">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${accent}`}>
        <Icon size={18} />
      </div>
      <div className="text-3xl font-bold text-gray-900">{value}</div>
      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 mt-1">{label}</div>
      {hint ? <div className="text-[11px] text-gray-400 mt-1">{hint}</div> : null}
    </div>
  );
}

export default function InstructorCourses() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadCourses();
  }, [user?.id]);

  const loadCourses = async () => {
    setLoading(true);
    try {
      const res = await courseApi.getAll({ size: 1000 });
      const myCourses = (res.data.items || []).filter((course) => course.createdById === user?.id);
      setCourses(myCourses);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCourse = async () => {
    if (!courseToDelete) return;
    setDeleting(true);
    try {
      await courseApi.delete(courseToDelete.id);
      toast.success('Course deleted successfully');
      setCourses((currentCourses) => currentCourses.filter((course) => course.id !== courseToDelete.id));
      setShowDeleteConfirm(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete course');
    } finally {
      setDeleting(false);
      setCourseToDelete(null);
    }
  };

  const courseSummaryCards = useMemo(() => {
    const published = courses.filter((course) => course.status === 'PUBLISHED').length;
    const draft = courses.filter((course) => course.status === 'DRAFT').length;
    return [
      { label: 'Total Courses', value: courses.length, icon: BookOpen, hint: 'courses you own', accent: 'bg-blue-50 text-blue-600' },
      { label: 'Published', value: published, icon: TrendingUp, hint: 'visible to students', accent: 'bg-emerald-50 text-emerald-600' },
      { label: 'Drafts', value: draft, icon: ClipboardList, hint: 'still in progress', accent: 'bg-amber-50 text-amber-600' },
    ];
  }, [courses]);

  if (loading) return <LoadingSpinner text="Loading courses..." />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="card p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-1">My Courses</h2>
        <p className="text-sm text-gray-500">Manage your courses and course content.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {courseSummaryCards.map((card, index) => (
          <div key={card.label} className="animate-slide-up" style={{ opacity: 0, animationDelay: `${index * 0.05}s` }}>
            <SummaryCard {...card} />
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800">My Courses</h3>
        <button onClick={() => navigate('/instructor/courses/new')} className="btn-primary">
          <Plus size={15} /> New Course
        </button>
      </div>

      {courses.length === 0 ? (
        <EmptyState icon={BookOpen} title="No courses yet" description="Create your first course to get started" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((course, i) => (
            <div
              key={course.id}
              className="card overflow-hidden cursor-pointer animate-slide-up"
              style={{ opacity: 0, animationDelay: `${i * 0.05}s` }}
              onClick={() => navigate(`/instructor/courses/${course.id}/edit`)}
            >
              <div className="h-28 bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
                {course.thumbnailUrl ? (
                  <img src={course.thumbnailUrl} alt={course.title} className="w-full h-full object-cover" />
                ) : (
                  <BookOpen size={28} className="text-blue-300" />
                )}
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-semibold text-gray-900 text-sm truncate flex-1">{course.title}</h4>
                  <StatusBadge status={course.status} size="xs" />
                </div>
                <p className="text-xs text-gray-400 line-clamp-2">{course.description || 'No description'}</p>
                <div className="mt-4 flex items-center justify-between">
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      setCourseToDelete(course);
                      setShowDeleteConfirm(true);
                    }}
                    className="p-2 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Delete course"
                  >
                    <Trash2 size={16} />
                  </button>
                  <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">
                    {course.lessonsCount || 0} Lessons
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteCourse}
        title="Delete Course"
        message={`Are you sure you want to delete "${courseToDelete?.title}"? This action cannot be undone and will remove all associated content.`}
        confirmText={deleting ? 'Deleting...' : 'Delete'}
        isDanger={true}
      />
    </div>
  );
}