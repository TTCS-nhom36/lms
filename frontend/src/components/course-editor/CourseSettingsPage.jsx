import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, Upload } from 'lucide-react';
import { courseApi } from '../../api/courseApi';
import { useToast } from '../../hooks/useToast';
import { getApiErrorMessage } from '../../utils/apiError';
import { firstError, validateCourseForm } from '../../utils/validation';
import LoadingSpinner from '../ui/LoadingSpinner';
import PageHeader from '../ui/PageHeader';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Dropdown from '../ui/Dropdown';
import Input from '../ui/Input';
import Textarea from '../ui/Textarea';

export default function CourseSettingsPage({ basePath = '/instructor' }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const isNew = !id || id === 'new';
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    thumbnailUrl: '',
    status: 'DRAFT',
  });
  const [formErrors, setFormErrors] = useState({});

  const loadCourse = useCallback(async () => {
    setLoading(true);
    try {
      const res = await courseApi.getById(id);
      const course = res.data.course || res.data;
      setForm({
        title: course.title || '',
        description: course.description || '',
        thumbnailUrl: course.thumbnailUrl || '',
        status: course.status || 'DRAFT',
      });
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to load course'));
      navigate(`${basePath}/courses`);
    } finally {
      setLoading(false);
    }
  }, [basePath, id, navigate, toast]);

  useEffect(() => {
    if (!isNew) loadCourse();
  }, [isNew, loadCourse]);

  const handleUpload = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    setUploading(true);
    try {
      const res = await courseApi.uploadThumbnail(file);
      setForm((current) => ({ ...current, thumbnailUrl: res.data.url }));
      toast.success('Thumbnail uploaded');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to upload thumbnail'));
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    const errors = validateCourseForm(form);
    setFormErrors(errors);
    if (Object.keys(errors).length) {
      toast.error(firstError(errors));
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        title: form.title.trim(),
        description: form.description?.trim() || '',
      };
      if (isNew) {
        const res = await courseApi.create(payload);
        toast.success('Course created');
        navigate(`${basePath}/courses/${res.data.id}`);
      } else {
        await courseApi.update(id, payload);
        toast.success('Course updated');
        navigate(`${basePath}/courses/${id}`);
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to save course'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner text="Loading course..." />;

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <PageHeader
        title={isNew ? 'Create Course' : 'Course Settings'}
        description="Primary course information only."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => navigate(isNew ? `${basePath}/courses` : `${basePath}/courses/${id}`)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save size={15} /> {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        }
      />

      <Card className="p-6 space-y-5">
        <Input label="Title *" required error={formErrors.title} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Course title" />
        <Textarea label="Description" rows={5} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Course description" />

        <div className="grid grid-cols-1 md:grid-cols-[1fr_180px] gap-5">
          <Input label="Thumbnail URL" type="url" error={formErrors.thumbnailUrl} value={form.thumbnailUrl} onChange={(event) => setForm({ ...form, thumbnailUrl: event.target.value })} placeholder="https://..." />
          <label className="btn-secondary self-end justify-center cursor-pointer">
            <Upload size={15} /> {uploading ? 'Uploading...' : 'Upload'}
            <input type="file" accept="image/*" className="hidden" onChange={(event) => handleUpload(event.target.files?.[0])} />
          </label>
        </div>

        {form.thumbnailUrl && (
          <div className="aspect-video rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
            <img src={form.thumbnailUrl} alt={form.title || 'Course thumbnail'} className="w-full h-full object-cover" />
          </div>
        )}

        <Dropdown
          label="Status"
          value={form.status}
          options={[
            { value: 'DRAFT', label: 'Draft' },
            { value: 'PUBLISHED', label: 'Published' },
            { value: 'ARCHIVED', label: 'Archived' },
          ]}
          onChange={(status) => setForm({ ...form, status })}
        />
      </Card>
    </div>
  );
}
