import { useCallback, useEffect, useMemo, useState } from 'react';
import { courseApi } from '../../api/courseApi';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Plus, TrendingUp, ClipboardList, Trash2, Edit } from 'lucide-react';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { useToast } from '../../hooks/useToast';
import { getApiErrorMessage } from '../../utils/apiError';
import PageHeader from '../../components/ui/PageHeader';
import MetricCard from '../../components/ui/MetricCard';
import CardGrid from '../../components/ui/CardGrid';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import CourseCard from '../../components/course/CourseCard';

export default function InstructorCourses() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadCourses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await courseApi.getAll({ size: 1000 });
      const myCourses = (res.data.items || []).filter((course) => course.createdById === user?.id);
      setCourses(myCourses);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to load courses'));
    } finally {
      setLoading(false);
    }
  }, [toast, user?.id]);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  const handleDeleteCourse = async () => {
    if (!courseToDelete) return;
    setDeleting(true);
    try {
      await courseApi.delete(courseToDelete.id);
      toast.success('Course deleted successfully');
      setCourses((currentCourses) => currentCourses.filter((course) => course.id !== courseToDelete.id));
      setShowDeleteConfirm(false);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to delete course'));
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
      <Card className="p-6">
        <PageHeader title="My Courses" description="Manage your courses and course content." />
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {courseSummaryCards.map((card, index) => (
          <div key={card.label} className="animate-slide-up" style={{ opacity: 0, animationDelay: `${index * 0.05}s` }}>
            <MetricCard {...card} />
          </div>
        ))}
      </div>

      <PageHeader
        title="My Courses"
        actions={<Button onClick={() => navigate('/instructor/courses/new')}><Plus size={15} /> New Course</Button>}
      />

      {courses.length === 0 ? (
        <EmptyState icon={BookOpen} title="No courses yet" description="Create your first course to get started" />
      ) : (
        <CardGrid>
          {courses.map((course, i) => (
            <CourseCard
              key={course.id}
              course={course}
              index={i}
              onClick={() => navigate(`/instructor/courses/${course.id}`)}
              footer={
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(event) => {
                        event.stopPropagation();
                        navigate(`/instructor/courses/${course.id}/edit`);
                      }}
                      className="!p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50"
                      title="Edit settings"
                    >
                      <Edit size={16} />
                    </Button>
                    <Button
                    variant="ghost"
                    size="sm"
                    onClick={(event) => {
                      event.stopPropagation();
                      setCourseToDelete(course);
                      setShowDeleteConfirm(true);
                    }}
                    className="!p-2 text-gray-400 hover:text-rose-500 hover:bg-rose-50"
                    title="Delete course"
                  >
                    <Trash2 size={16} />
                  </Button>
                  </div>
                  <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">
                    {course.lessonsCount || 0} Lessons
                  </span>
                </div>
              }
            />
          ))}
        </CardGrid>
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
