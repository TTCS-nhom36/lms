import { useEffect, useMemo, useState } from 'react';
import { statsApi } from '../../api/statsApi';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { BookOpen, GraduationCap, UserPlus, Users, ClipboardList, Award, BarChart3, CheckCircle2 } from 'lucide-react';
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

export default function AdminDashboard() {
  const toast = useToast();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const summaryRes = await statsApi.getAdminSummary();
      setSummary(summaryRes.data);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load admin statistics');
    } finally {
      setLoading(false);
    }
  };

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
      

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {summaryCards.map((card, index) => (
          <div key={card.label} className="animate-slide-up" style={{ opacity: 0, animationDelay: `${index * 0.04}s` }}>
            <SummaryCard {...card} />
          </div>
        ))}
      </div>
    </div>
  );
}
