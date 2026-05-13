import { useCallback, useState, useEffect } from 'react';
import { courseApi } from '../../api/courseApi';
import { useToast } from '../../hooks/useToast';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { getApiErrorMessage } from '../../utils/apiError';
import { useNavigate } from 'react-router-dom';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import EmptyState from '../../components/ui/EmptyState';
import Pagination from '../../components/ui/Pagination';
import PageHeader from '../../components/ui/PageHeader';
import SearchInput from '../../components/ui/SearchInput';
import CardGrid from '../../components/ui/CardGrid';
import Button from '../../components/ui/Button';
import Dropdown from '../../components/ui/Dropdown';
import CourseCard from '../../components/course/CourseCard';
import { Plus, Edit, Trash2, Send, BookOpen } from 'lucide-react';

export default function AdminCourses() {
  const toast = useToast();
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [statusFilter, setStatusFilter] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const loadCourses = useCallback(async () => {
    try {
      const params = { page, size: 12 };
      if (debouncedSearch) params.search = debouncedSearch;
      if (statusFilter) params.status = statusFilter;
      const res = await courseApi.getAll(params);
      setCourses(res.data.items || []);
      setTotalPages(res.data.totalPages || 0);
      setTotalElements(res.data.totalElements || 0);
    } catch (error) { toast.error(getApiErrorMessage(error, 'Failed to load courses')); }
    finally { setLoading(false); }
  }, [debouncedSearch, page, statusFilter, toast]);

  useEffect(() => { loadCourses(); }, [loadCourses]);

  const handleCreate = () => {
    navigate('/admin/courses/new');
  };

  const handleEdit = (c) => {
    navigate(`/admin/courses/${c.id}/edit`);
  };



  const handleDelete = async () => {
    try { await courseApi.delete(deleteId); toast.success('Course archived'); setShowConfirm(false); loadCourses(); }
    catch (error) { toast.error(getApiErrorMessage(error, 'Failed to archive course')); }
  };

  const handlePublish = async (id) => {
    try { await courseApi.publish(id); toast.success('Course published'); loadCourses(); }
    catch (error) { toast.error(getApiErrorMessage(error, 'Failed to publish course')); }
  };

  if (loading) return <LoadingSpinner text="Loading courses..." />;

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="Course Management"
        description={`${totalElements} total courses`}
        actions={<Button onClick={handleCreate}><Plus size={15} /> New Course</Button>}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput value={search} placeholder="Search courses..." className="flex-1 max-w-sm" onChange={(e) => { setSearch(e.target.value); setPage(0); }} />
        <Dropdown
          value={statusFilter}
          placeholder="All Status"
          options={[
            { value: 'DRAFT', label: 'Draft' },
            { value: 'PUBLISHED', label: 'Published' },
            { value: 'ARCHIVED', label: 'Archived' },
          ]}
          onChange={(status) => { setStatusFilter(status); setPage(0); }}
          className="w-36"
        />
      </div>

      {courses.length === 0 ? (
        <EmptyState icon={BookOpen} title="No courses found" />
      ) : (
        <CardGrid>
          {courses.map((c, i) => (
            <CourseCard
              key={c.id}
              course={c}
              index={i}
              statusPlacement="image"
              onClick={() => navigate(`/admin/courses/${c.id}`)}
              actions={
                <>
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleEdit(c); }} className="!p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50" title="Edit">
                    <Edit size={14} />
                  </Button>
                  {c.status === 'DRAFT' && (
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handlePublish(c.id); }} className="!p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50" title="Publish">
                      <Send size={14} />
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setDeleteId(c.id); setShowConfirm(true); }} className="!p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 ml-auto" title="Archive">
                    <Trash2 size={14} />
                  </Button>
                </>
              }
            />
          ))}
        </CardGrid>
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />



      <ConfirmDialog isOpen={showConfirm} onClose={() => setShowConfirm(false)} onConfirm={handleDelete} title="Archive Course" message="This will archive the course. Are you sure?" />
    </div>
  );
}
