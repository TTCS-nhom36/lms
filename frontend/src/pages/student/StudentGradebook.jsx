import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Award, BookOpen, TrendingUp } from 'lucide-react';
import { courseApi } from '../../api/courseApi';
import { useToast } from '../../hooks/useToast';
import { getApiErrorMessage } from '../../utils/apiError';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import StatusBadge from '../../components/ui/StatusBadge';
import PageHeader from '../../components/ui/PageHeader';
import MetricCard from '../../components/ui/MetricCard';
import CardGrid from '../../components/ui/CardGrid';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import { getScoreColor } from '../../utils/gradebookFormatter';

export default function StudentGradebook() {
  const navigate = useNavigate();
  const toast = useToast();
  const [courses, setCourses] = useState([]);
  const [gradebooks, setGradebooks] = useState({});
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const coursesRes = await courseApi.getMyCourses();
      const enrolledCourses = coursesRes.data || [];
      setCourses(enrolledCourses);

      const gradesData = {};
      for (const course of enrolledCourses) {
        try {
          const gradebookRes = await courseApi.getGradebook(course.id);
          gradesData[course.id] = gradebookRes.data;
        } catch {
          console.error(`Failed to load gradebook for course ${course.id}`);
          gradesData[course.id] = null;
        }
      }
      setGradebooks(gradesData);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to load gradebook data'));
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadData(); }, [loadData]);

  const getStudentPerformance = (courseId) => {
    const gradebook = gradebooks[courseId];
    if (!gradebook?.entries?.length) return null;

    const allScores = gradebook.entries
      .map((entry) => Number(entry.averageScore || 0))
      .filter((score) => score > 0);

    return {
      totalStudents: gradebook.entries.length,
      averageClassScore: allScores.length > 0
        ? (allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(1)
        : '-',
      totalAssignments: gradebook.entries[0]?.totalAssignments || 0,
    };
  };

  if (loading) return <LoadingSpinner text="Loading your grades..." />;

  return (
    <div className="space-y-6 animate-fade-in">
      <Card className="p-6">
        <PageHeader title="My Performance" description="Track your progress across all enrolled courses" />
      </Card>

      <CardGrid columns="grid-cols-1 md:grid-cols-3">
        <MetricCard icon={BookOpen} label="Enrolled Courses" value={courses.length} accent="bg-blue-50 text-blue-600" />
        <MetricCard icon={TrendingUp} label="Class Rank" value="-" accent="bg-emerald-50 text-emerald-600" />
        <MetricCard icon={Award} label="Avg GPA" value="-" accent="bg-amber-50 text-amber-600" />
      </CardGrid>

      {courses.length === 0 ? (
        <Card className="p-12 text-center">
          <BookOpen size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">You're not enrolled in any courses yet.</p>
          <Button onClick={() => navigate('/student/browse')} className="mt-4">
            Browse Courses
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Courses</h3>
          <div className="grid gap-4">
            {courses.map((course) => {
              const performance = getStudentPerformance(course.id);
              return (
                <Card
                  as="button"
                  key={course.id}
                  className="w-full p-6 text-left hover:shadow-md transition-all cursor-pointer"
                  onClick={() => navigate(`/student/courses/${course.id}`)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="text-lg font-semibold text-gray-900">{course.title}</h4>
                        <StatusBadge status={course.status} size="xs" />
                      </div>
                      <p className="text-xs text-gray-500 mb-4">{course.description}</p>

                      {performance && (
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Class Average</p>
                            <p className={`text-lg font-bold mt-1 ${getScoreColor(performance.averageClassScore)}`}>
                              {performance.averageClassScore}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Assignments</p>
                            <p className="text-lg font-bold text-gray-900 mt-1">{performance.totalAssignments}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Students</p>
                            <p className="text-lg font-bold text-gray-900 mt-1">{performance.totalStudents}</p>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Click to view details</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
