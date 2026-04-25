import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Shield, BookOpen, Users, ArrowRight, Sparkles, Layers3, BadgeCheck } from 'lucide-react';

const roles = [
  {
    key: 'ADMIN',
    label: 'Admin',
    icon: Shield,
    desc: 'Manage users, courses & system settings',
    mockUser: { fullName: 'Admin User', email: 'admin@lms.com' },
  },
  {
    key: 'INSTRUCTOR',
    label: 'Instructor',
    icon: BookOpen,
    desc: 'Create courses, lessons & grade assignments',
    mockUser: { fullName: 'Instructor User', email: 'instructor@lms.com' },
  },
  {
    key: 'STUDENT',
    label: 'Student',
    icon: Users,
    desc: 'Enroll in courses, learn & submit assignments',
    mockUser: { fullName: 'Student User', email: 'student@lms.com' },
  },
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleRoleSelect = (role) => {
    const mockId = crypto.randomUUID ? crypto.randomUUID() : '00000000-0000-0000-0000-000000000001';
    login({
      id: mockId,
      email: role.mockUser.email,
      fullName: role.mockUser.fullName,
      role: role.key,
      avatarUrl: '',
    });
    const redirects = { ADMIN: '/admin/dashboard', INSTRUCTOR: '/instructor/dashboard', STUDENT: '/student/dashboard' };
    navigate(redirects[role.key]);
  };

  return (
    <div className="min-h-screen px-5 py-6 lg:px-10 lg:py-8 flex items-center justify-center">
      <div className="w-full max-w-7xl grid lg:grid-cols-[1.15fr_0.85fr] gap-6 lg:gap-8 items-stretch">
        <section className="card relative overflow-hidden px-7 py-8 lg:px-10 lg:py-12 animate-slide-up">
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_right,rgba(47,107,255,0.14),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(15,157,88,0.10),transparent_28%)]" />
          <div className="relative z-10 max-w-2xl">
            <div className="section-kicker flex items-center gap-2 mb-5">
              <Sparkles size={14} />
              Learning workspace
            </div>
            <h1 className="hero-display max-w-xl mb-6">
              A sharper way to run courses, teach, and keep momentum.
            </h1>
            <p className="body-primary max-w-2xl mb-8">
              Sign in as the role you want to preview. The refreshed workspace keeps the UI quiet, the hierarchy clear, and the content in focus.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
              {[
                { label: 'Structured flows', value: '3 roles' },
                { label: 'Cleaner navigation', value: 'One shell' },
                { label: 'Faster scanning', value: 'Reduced noise' },
              ].map((item) => (
                <div key={item.label} className="surface p-4">
                  <div className="text-2xl font-semibold tracking-tight text-[color:var(--app-text)]">{item.value}</div>
                  <div className="micro-ui text-[color:var(--app-text-soft)] mt-1">{item.label}</div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              <span className="app-topbar__chip">Admin</span>
              <span className="app-topbar__chip">Instructor</span>
              <span className="app-topbar__chip">Student</span>
            </div>
          </div>
        </section>

        <section className="card px-5 py-5 lg:px-6 lg:py-6 animate-slide-up">
          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="section-kicker mb-2">Select a role</div>
              <h2 className="card-title">Enter the workspace</h2>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-[color:var(--app-accent-soft)] text-[color:var(--app-accent)] flex items-center justify-center">
              <Layers3 size={18} />
            </div>
          </div>

          <div className="grid gap-4">
            {roles.map((role) => (
              <button
                key={role.key}
                onClick={() => handleRoleSelect(role)}
                className="apple-panel-dark p-5 text-left flex items-center gap-4 transition-transform hover:scale-[1.01] cursor-pointer"
              >
                <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center flex-shrink-0">
                  <role.icon size={21} className="text-white" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-[1.05rem] font-semibold text-white">{role.label}</h3>
                    <BadgeCheck size={14} className="text-[#8fb1ff]" />
                  </div>
                  <p className="micro-ui text-white/65 leading-relaxed">{role.desc}</p>
                </div>

                <div className="text-white/70">
                  <ArrowRight size={18} />
                </div>
              </button>
            ))}
          </div>

          <div className="mt-6 rounded-2xl border border-[color:var(--app-border)] bg-white/72 p-4 flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-[color:var(--app-accent-soft)] text-[color:var(--app-accent)] flex items-center justify-center flex-shrink-0">
              <Shield size={16} />
            </div>
            <div>
              <div className="font-semibold text-[color:var(--app-text)]">Mock sign-in only</div>
              <p className="micro-ui text-[color:var(--app-text-soft)] mt-1">
                This login screen swaps in local demo users so you can move through the redesigned experience quickly.
              </p>
            </div>
          </div>
        </section>
      </div>

      <div className="fixed bottom-4 left-0 right-0 text-center pointer-events-none">
        <p className="micro-ui text-[color:var(--app-text-soft)]">LMS Portal Platform © 2026</p>
      </div>
    </div>
  );
}
