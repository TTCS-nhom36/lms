import { useCallback, useEffect, useMemo, useState } from 'react';
import { statsApi } from '../../api/statsApi';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import MetricCard from '../../components/ui/MetricCard';
import CardGrid from '../../components/ui/CardGrid';
import { BookOpen, GraduationCap, UserPlus, Users, ClipboardList, Award, BarChart3, CheckCircle2 } from 'lucide-react';
import { useToast } from '../../hooks/useToast';
import { getApiErrorMessage } from '../../utils/apiError';

export default function AdminDashboard() {
  const toast = useToast();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const summaryRes = await statsApi.getAdminSummary();
      setSummary(summaryRes.data);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to load admin statistics'));
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const summaryCards = useMemo(() => ([
    { label: 'Total Users', value: summary?.totalUsers || 0, icon: Users, hint: `${summary?.activeUsers || 0} active accounts`, accent: 'bg-blue-50 text-blue-600' },
    { label: 'Students', value: summary?.students || 0, icon: GraduationCap, hint: 'enrolled learners', accent: 'bg-emerald-50 text-emerald-600' },
    { label: 'Instructors', value: summary?.instructors || 0, icon: UserPlus, hint: 'teaching staff', accent: 'bg-amber-50 text-amber-600' },
    { label: 'Total Courses', value: summary?.totalCourses || 0, icon: BookOpen, hint: `${summary?.publishedCourses || 0} published`, accent: 'bg-purple-50 text-purple-600' },
    { label: 'Enrollments', value: summary?.totalEnrollments || 0, icon: ClipboardList, hint: 'course registrations', accent: 'bg-sky-50 text-sky-600' },
    { label: 'Avg Score', value: Number(summary?.averageScore || 0).toFixed(1), icon: Award, hint: 'across all submissions', accent: 'bg-rose-50 text-rose-600' },
    { label: 'Avg Completion', value: `${Number(summary?.averageCompletionRate || 0).toFixed(1)}%`, icon: BarChart3, hint: 'lesson completion rate', accent: 'bg-teal-50 text-teal-600' },
    { label: 'Submissions', value: summary?.totalSubmissions || 0, icon: CheckCircle2, hint: 'all graded or pending work', accent: 'bg-gray-50 text-gray-700' },
  ]), [summary]);

  if (loading) return <LoadingSpinner text="Loading dashboard..." />;

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      

      <CardGrid columns="grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card, index) => (
          <div key={card.label} className="animate-slide-up" style={{ opacity: 0, animationDelay: `${index * 0.04}s` }}>
            <MetricCard {...card} />
          </div>
        ))}
      </CardGrid>
    </div>
  );
}
