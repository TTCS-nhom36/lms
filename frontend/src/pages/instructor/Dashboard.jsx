import { useState, useEffect } from 'react';
import { courseApi } from '../../api/courseApi';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Plus, TrendingUp, ClipboardList, Trash2 } from 'lucide-react';
import StatusBadge from '../../components/ui/StatusBadge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { useToast } from '../../contexts/ToastContext';

export default function InstructorDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { loadCourses(); }, []);

  const loadCourses = async () => {
    try {
      const res = await courseApi.getAll({ size: 50 });
      const myCourses = (res.data.items || []).filter((c) => c.createdById === user?.id);
      setCourses(myCourses);
    } catch { 
      toast.error('Failed to load courses');
    }
    finally { setLoading(false); }
  };

  const handleDeleteCourse = async () => {
    if (!courseToDelete) return;
    setDeleting(true);
    try {
      await courseApi.delete(courseToDelete.id);
      toast.success('Course deleted successfully');
      setCourses(courses.filter(c => c.id !== courseToDelete.id));
      setShowDeleteConfirm(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete course');
    } finally {
      setDeleting(false);
      setCourseToDelete(null);
    }
  };

  if (loading) return <LoadingSpinner text="Loading dashboard..." />;

  const published = courses.filter((c) => c.status === 'PUBLISHED').length;
  const draft = courses.filter((c) => c.status === 'DRAFT').length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome */}
      <div className="card p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-1">
          Welcome back, <span className="gradient-text">{user?.fullName}</span> 👋
        </h2>
        <p className="text-sm text-gray-500">Here's an overview of your courses and teaching activity.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Total Courses', value: courses.length, icon: BookOpen, bg: 'bg-blue-50', iconColor: 'text-blue-500' },
          { label: 'Published', value: published, icon: TrendingUp, bg: 'bg-green-50', iconColor: 'text-green-500' },
          { label: 'Drafts', value: draft, icon: ClipboardList, bg: 'bg-amber-50', iconColor: 'text-amber-500' },
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

      {/* Courses */}
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
          {courses.map((c, i) => (
            <div
              key={c.id}
              className="card overflow-hidden cursor-pointer animate-slide-up"
              style={{ opacity: 0, animationDelay: `${i * 0.05}s` }}
              onClick={() => navigate(`/instructor/courses/${c.id}/edit`)}
            >
              <div className="h-28 bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
                {c.thumbnailUrl ? (
                  <img src={c.thumbnailUrl} alt={c.title} className="w-full h-full object-cover" />
                ) : (
                  <BookOpen size={28} className="text-blue-300" />
                )}
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-semibold text-gray-900 text-sm truncate flex-1">{c.title}</h4>
                  <StatusBadge status={c.status} size="xs" />
                </div>
                <p className="text-xs text-gray-400 line-clamp-2">{c.description || 'No description'}</p>
                <div className="mt-4 flex items-center justify-between">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCourseToDelete(c);
                      setShowDeleteConfirm(true);
                    }}
                    className="p-2 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Delete course"
                  >
                    <Trash2 size={16} />
                  </button>
                  <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">
                    {c.lessonsCount || 0} Lessons
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteCourse}
        title="Delete Course"
        message={`Are you sure you want to delete "${courseToDelete?.title}"? This action cannot be undone and will remove all associated content.`}
        confirmText={deleting ? "Deleting..." : "Delete"}
        isDanger={true}
      />
    </div>
  );
}
