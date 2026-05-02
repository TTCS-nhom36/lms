import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { courseApi } from '../../api/courseApi';
import { useToast } from '../../contexts/ToastContext';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import StatusBadge from '../../components/ui/StatusBadge';
import { formatScore, getScoreColor, calculateCompletionRate, getCompletionStatus } from '../../utils/gradebookFormatter';
import { BookOpen, TrendingUp, Award } from 'lucide-react';

export default function StudentGradebook() {
  const navigate = useNavigate();
  const toast = useToast();
  const [courses, setCourses] = useState([]);
  const [gradebooks, setGradebooks] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Get list of enrolled courses
      const coursesRes = await courseApi.getMyCourses();
      const enrolledCourses = coursesRes.data || [];
      setCourses(enrolledCourses);

      // Load gradebook for each course to get personal performance
      const gradesData = {};
      for (const course of enrolledCourses) {
        try {
          const gradebookRes = await courseApi.getGradebook(course.id);
          gradesData[course.id] = gradebookRes.data;
        } catch (err) {
          console.error(`Failed to load gradebook for course ${course.id}`);
          gradesData[course.id] = null;
        }
      }
      setGradebooks(gradesData);
    } catch (err) {
      toast.error('Failed to load gradebook data');
    } finally {
      setLoading(false);
    }
  };

  const getStudentPerformance = (courseId) => {
    const gradebook = gradebooks[courseId];
    if (!gradebook) return null;
    
    // Find current user's entry (since we can't get user context directly, 
    // we'll show summary stats instead)
    if (!gradebook.entries || gradebook.entries.length === 0) return null;
    
    // Calculate class average and stats
    const allScores = gradebook.entries
      .map(e => Number(e.averageScore || 0))
      .filter(score => score > 0);
    
    return {
      courseTitle: gradebook.courseTitle,
      totalStudents: gradebook.entries.length,
      averageClassScore: allScores.length > 0
        ? (allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(1)
        : '—',
      totalAssignments: gradebook.entries[0]?.totalAssignments || 0,
    };
  };

  if (loading) return <LoadingSpinner text="Loading your grades..." />;

  const stats = {
    enrolledCourses: courses.length,
    averageGPA: '—', // Would need more data to calculate
    completedAssignments: 0,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="card p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">My Performance</h2>
        <p className="text-sm text-gray-500">Track your progress across all enrolled courses</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-5 bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-blue-600 uppercase tracking-wide font-semibold">Enrolled Courses</p>
              <p className="text-3xl font-bold text-blue-900 mt-1">{stats.enrolledCourses}</p>
            </div>
            <BookOpen size={32} className="text-blue-400" />
          </div>
        </div>

        <div className="card p-5 bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-emerald-600 uppercase tracking-wide font-semibold">Class Rank</p>
              <p className="text-3xl font-bold text-emerald-900 mt-1">—</p>
            </div>
            <TrendingUp size={32} className="text-emerald-400" />
          </div>
        </div>

        <div className="card p-5 bg-gradient-to-br from-amber-50 to-amber-100/50 border border-amber-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-amber-600 uppercase tracking-wide font-semibold">Avg GPA</p>
              <p className="text-3xl font-bold text-amber-900 mt-1">{stats.averageGPA}</p>
            </div>
            <Award size={32} className="text-amber-400" />
          </div>
        </div>
      </div>

      {/* Course Performance */}
      {courses.length === 0 ? (
        <div className="card p-12 text-center">
          <BookOpen size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">You're not enrolled in any courses yet.</p>
          <button 
            onClick={() => navigate('/student/browse')}
            className="mt-4 btn-primary"
          >
            Browse Courses
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Courses</h3>
          <div className="grid gap-4">
            {courses.map((course) => {
              const performance = getStudentPerformance(course.id);
              return (
                <div 
                  key={course.id}
                  className="card p-6 hover:shadow-md transition-all cursor-pointer border border-gray-200"
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
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
