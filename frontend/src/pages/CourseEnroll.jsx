import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, UserMinus, UserPlus, Users } from 'lucide-react';
import { courseApi } from '../api/courseApi';
import { userApi } from '../api/userApi';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { getApiErrorMessage } from '../utils/apiError';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import PageHeader from '../components/ui/PageHeader';
import EmptyState from '../components/ui/EmptyState';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import SearchInput from '../components/ui/SearchInput';

export default function CourseEnroll() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { isAdmin } = useAuth();
  const basePath = isAdmin ? '/admin' : '/instructor';
  const [course, setCourse] = useState(null);
  const [students, setStudents] = useState([]);
  const [enrolled, setEnrolled] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [enrolling, setEnrolling] = useState(null);
  const [unenrolling, setUnenrolling] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [courseRes, usersRes, studentsRes] = await Promise.all([
        courseApi.getById(id),
        userApi.getAll({ size: 1000, role: 'STUDENT' }),
        courseApi.getStudents(id),
      ]);
      setCourse(courseRes.data.course || courseRes.data);
      setStudents(usersRes.data.items || []);
      setEnrolled(studentsRes.data || []);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to load enrollment data'));
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => { loadData(); }, [loadData]);

  const enrolledIds = useMemo(() => new Set(enrolled.map((student) => String(student.id))), [enrolled]);
  const filteredStudents = useMemo(() => {
    const term = search.trim().toLowerCase();
    return students.filter((student) => {
      const matches = !term
        || student.fullName?.toLowerCase().includes(term)
        || student.email?.toLowerCase().includes(term);
      return matches;
    });
  }, [search, students]);

  const handleEnroll = async (student) => {
    setEnrolling(student.id);
    try {
      await courseApi.enrollStudent(id, student.id);
      toast.success('Student enrolled');
      setEnrolled((current) => current.some((item) => item.id === student.id) ? current : [...current, student]);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to enroll student'));
    } finally {
      setEnrolling(null);
    }
  };

  const handleUnenroll = async (student) => {
    setUnenrolling(student.id);
    try {
      await courseApi.unenrollStudent(id, student.id);
      toast.success('Enrollment canceled');
      setEnrolled((current) => current.filter((item) => item.id !== student.id));
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to cancel enrollment'));
    } finally {
      setUnenrolling(null);
    }
  };

  if (loading) return <LoadingSpinner text="Loading enrollment..." />;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Enroll Students"
        description={course?.title || 'Manual course enrollment'}
        actions={
          <Button variant="secondary" onClick={() => navigate(`${basePath}/courses/${id}`)}>
            <ArrowLeft size={15} /> Back
          </Button>
        }
      />

     

      <Card className="p-4">
        <SearchInput value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search students..." />
      </Card>

      {filteredStudents.length === 0 ? (
        <EmptyState icon={Users} title="No students found" />
      ) : (
        <Card className="overflow-hidden">
          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>Email</th>
                <th>Status</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student) => {
                const isEnrolled = enrolledIds.has(String(student.id));
                return (
                  <tr key={student.id}>
                    <td className="font-medium text-gray-900">{student.fullName}</td>
                    <td className="text-gray-500">{student.email}</td>
                    <td className={isEnrolled ? 'text-emerald-600 font-semibold' : 'text-gray-400'}>{isEnrolled ? 'Enrolled' : 'Not enrolled'}</td>
                    <td className="text-right">
                      {isEnrolled ? (
                        <Button
                          variant="danger"
                          onClick={() => handleUnenroll(student)}
                          disabled={unenrolling === student.id}
                          className="disabled:opacity-50"
                        >
                          <UserMinus size={14} /> {unenrolling === student.id ? 'Canceling...' : 'Cancel enroll'}
                        </Button>
                      ) : (
                        <Button onClick={() => handleEnroll(student)} disabled={enrolling === student.id} className="disabled:opacity-50">
                          <UserPlus size={14} /> {enrolling === student.id ? 'Enrolling...' : 'Enroll'}
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
