import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookMarked } from 'lucide-react';
import { courseApi } from '../../api/courseApi';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import EmptyState from '../../components/ui/EmptyState';
import PageHeader from '../../components/ui/PageHeader';
import CardGrid from '../../components/ui/CardGrid';
import CourseCard from '../../components/course/CourseCard';

export default function MyCourses() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const res = await courseApi.getMyCourses();
      setCourses(res.data || []);
    } catch {
      console.error('Failed to load');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner text="Loading courses..." />;

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader title="My Courses" description={`${courses.length} enrolled courses`} />

      {courses.length === 0 ? (
        <EmptyState icon={BookMarked} title="No enrolled courses" description="Browse courses and enroll to start learning" />
      ) : (
        <CardGrid>
          {courses.map((course, index) => (
            <CourseCard
              key={course.id}
              course={course}
              index={index}
              tone="emerald"
              showStatus={false}
              progress={course.progressPercent || 0}
              onClick={() => navigate(`/student/courses/${course.id}`)}
            />
          ))}
        </CardGrid>
      )}
    </div>
  );
}
