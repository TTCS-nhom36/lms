import { useCallback, useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { courseApi } from '../../api/courseApi';
import { useToast } from '../../hooks/useToast';
import { getApiErrorMessage } from '../../utils/apiError';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import PageHeader from '../../components/ui/PageHeader';
import SearchInput from '../../components/ui/SearchInput';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import GradebookTable from '../../components/gradebook/GradebookTable';
import StudentDetailModal from '../../components/gradebook/StudentDetailModal';
import { ArrowLeft, Download, FileSpreadsheet } from 'lucide-react';

export default function Gradebook() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name'); // name, submitted, score
  const [sortOrder, setSortOrder] = useState('asc'); // asc, desc
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showDetail, setShowDetail] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await courseApi.getGradebook(courseId);
      setData(res.data);
    } catch (error) {
      setError('Failed to load gradebook. Please try again.');
      toast.error(getApiErrorMessage(error, 'Failed to load gradebook'));
    } finally {
      setLoading(false);
    }
  }, [courseId, toast]);

  useEffect(() => { loadData(); }, [loadData]);

  const filteredAndSortedData = useMemo(() => {
    if (!data?.entries) return [];

    // Filter by search term
    let filtered = data.entries.filter(e =>
      e.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Sort
    filtered.sort((a, b) => {
      let aVal, bVal;
      
      if (sortBy === 'name') {
        aVal = (a.fullName || '').toLowerCase();
        bVal = (b.fullName || '').toLowerCase();
      } else if (sortBy === 'submitted') {
        aVal = a.submittedAssignments || 0;
        bVal = b.submittedAssignments || 0;
      } else if (sortBy === 'score') {
        aVal = Number(a.averageScore || 0);
        bVal = Number(b.averageScore || 0);
      }

      if (sortOrder === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
    });

    return filtered;
  }, [data, searchTerm, sortBy, sortOrder]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await courseApi.exportGradebook(courseId);
      // res.data is already a Blob
      const url = window.URL.createObjectURL(res.data);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `gradebook-course-${courseId}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Gradebook exported successfully');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to export gradebook'));
    } finally {
      setExporting(false);
    }
  };

  const handleSort = (newSortBy) => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('asc');
    }
  };

  const openStudentDetail = (student) => {
    setSelectedStudent(student);
    setShowDetail(true);
  };

  if (loading) return <LoadingSpinner text="Loading gradebook..." />;
  const shouldRenderLegacyHeader = data?.legacyHeader === true;

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="Gradebook"
        description={`${data?.courseTitle} - ${data?.entries?.length || 0} students`}
        actions={
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="!p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100" title="Back">
              <ArrowLeft size={18} />
            </Button>
            <Button
              onClick={handleExport}
              disabled={exporting || !data?.entries?.length}
              className="disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download size={14} /> {exporting ? 'Exporting...' : 'Export Excel'}
            </Button>
          </div>
        }
      />
      {shouldRenderLegacyHeader && <div className="hidden">
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-gray-900">Gradebook</h2>
          <p className="text-xs text-gray-500">{data?.courseTitle} - {data?.entries?.length || 0} students</p>
        </div>
        <button 
          onClick={handleExport} 
          disabled={exporting || !data?.entries?.length}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download size={14} /> {exporting ? 'Exporting...' : 'Export Excel'}
        </button>
      </div>}

      {error && (
        <Card className="bg-red-50 border-red-200 p-4 rounded-lg">
          <p className="text-red-700 text-sm font-medium">{error}</p>
          <Button variant="ghost" size="sm" onClick={loadData} className="mt-2 !p-0 text-red-600 hover:underline hover:bg-transparent">
            Try again
          </Button>
        </Card>
      )}

      {!data?.entries?.length ? (
        <Card className="p-12 text-center">
          <FileSpreadsheet size={36} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No gradebook data available</p>
        </Card>
      ) : (
        <>
          <Card className="p-4 border border-gray-200">
            <SearchInput
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name or email..."
            />
          </Card>
          <GradebookTable
            entries={filteredAndSortedData}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSort={handleSort}
            onOpenStudent={openStudentDetail}
          />
        </>
      )}
      <StudentDetailModal
        isOpen={showDetail}
        onClose={() => setShowDetail(false)}
        student={selectedStudent}
      />
    </div>
  );
}



