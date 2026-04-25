import { useState, useEffect } from 'react';
import { userApi } from '../../api/userApi';
import { courseApi } from '../../api/courseApi';
import { Users, BookOpen, GraduationCap, TrendingUp, UserPlus } from 'lucide-react';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ users: 0, courses: 0, students: 0, instructors: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [usersRes, coursesRes] = await Promise.all([
        userApi.getAll({ size: 1000 }), // Get a large enough set or ideally the backend should have a dedicated stats endpoint
        courseApi.getAll({ size: 1 }),
      ]);
      const allUsers = usersRes.data;
      setStats({
        users: allUsers.totalElements || 0,
        courses: coursesRes.data.totalElements || 0,
        students: allUsers.items?.filter((u) => u.role === 'STUDENT').length || 0,
        instructors: allUsers.items?.filter((u) => u.role === 'INSTRUCTOR').length || 0,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner text="Loading dashboard..." />;

  const statCards = [
    { label: 'Total Users', value: stats.users, icon: Users },
    { label: 'Total Courses', value: stats.courses, icon: BookOpen },
    { label: 'Students Enrolled', value: stats.students, icon: GraduationCap },
    { label: 'Platform Instructors', value: stats.instructors, icon: UserPlus },
  ];

  return (
    <div className="space-y-12 animate-fade-in pb-16">
      {/* Editorial Header */}
      <div className="border-b border-[#d2d2d7] pb-8">
        <h2 className="section-display text-[#1d1d1f] mb-4 text-[56px] tracking-tight">Overview</h2>
        <p className="body-primary text-[#6e6e73] text-[21px] max-w-2xl">A quick look at your platform's performance and recent activity.</p>
      </div>

      {/* Stats Grid - Widened gap and padding */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
        {statCards.map((stat, i) => (
          <div
            key={stat.label}
            className="apple-card p-10 flex flex-col justify-between min-h-[200px] animate-slide-up"
            style={{ opacity: 0, animationDelay: `${i * 0.05}s` }}
          >
            <div className="flex items-start justify-between mb-8">
              <stat.icon size={28} className="text-[#1d1d1f]" />
              <TrendingUp size={20} className="text-[#86868b]" />
            </div>
            <div>
              <div className="hero-display !text-[64px] text-[#1d1d1f] mb-2">{stat.value}</div>
              <div className="body-emphasis text-[#6e6e73] font-medium">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
