import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '../../contexts/ToastContext';
import {
  Save, PlayCircle, FileText, Upload, Plus,
  Trash2, Edit, CheckCircle, ChevronLeft
} from 'lucide-react';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { courseApi } from '../../api/courseApi';
import { useAuth } from '../../contexts/AuthContext';

export default function CourseEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const isNew = id === 'new';

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('settings');
  const [course, setCourse] = useState({
    title: '',
    description: '',
    thumbnailUrl: '',
    status: 'DRAFT'
  });

  // Load course data if editing
  const loadCourse = useCallback(async () => {
    setLoading(true);
    try {
      const res = await courseApi.getById(id);
      setCourse({
        title: res.data.title || '',
        description: res.data.description || '',
        thumbnailUrl: res.data.thumbnailUrl || '',
        status: res.data.status || 'DRAFT'
      });
    } catch (error) {
      console.error('Failed to load course:', error);
      toast.error('Failed to load course');
      setTimeout(() => navigate('/instructor/courses'), 1500);
    } finally {
      setLoading(false);
    }
  }, [id, toast, navigate]);

  useEffect(() => {
    if (!isNew && id) {
      loadCourse();
    } else {
      setLoading(false);
    }
  }, [id, isNew, loadCourse]);

  const handleSave = async () => {
    if (!course.title.trim()) {
      toast.error('Course title is required');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: course.title,
        description: course.description,
        thumbnailUrl: course.thumbnailUrl,
        status: course.status,
        createdById: user?.id
      };

      await courseApi.create(payload);
      toast.success('Course created successfully');

      navigate('/instructor/courses');
    } catch (error) {
      console.error('Save error:', error);
      const message = error.response?.data?.message || 'Failed to save course';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (isNew) {
      toast.error('Please save the course first before publishing');
      return;
    }

    setSaving(true);
    try {
      await courseApi.publish(id);
      setCourse({ ...course, status: 'PUBLISHED' });
      toast.success('Course published successfully');
    } catch (error) {
      console.error('Publish error:', error);
      const message = error.response?.data?.message || error.message || 'Failed to publish course';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner text="Loading course..." />;

  const tabs = [
    { id: 'settings', label: 'Primary Settings' },
    { id: 'curriculum', label: 'Curriculum Model' },
    { id: 'media', label: 'Media & Covers' },
  ];

  return (
    <div className="max-w-[1024px] mx-auto space-y-8 pb-32 animate-fade-in">
      {/* Editorial Header */}
      <div className="flex items-end justify-between border-b border-[#d2d2d7] pb-8">
        <div>
          <button onClick={() => navigate('/instructor/courses')} className="flex items-center gap-1 apple-link text-[14px] font-medium mb-4">
            <ChevronLeft size={16} /> Back to Courses
          </button>
          <div className="flex items-center gap-4">
            <h1 className="section-display text-[#1d1d1f]">{isNew ? 'Create Course' : 'Configure Course'}</h1>
            <span className="px-3 py-1 rounded-[6px] bg-[#f5f5f7] border border-[#d2d2d7] text-[11px] font-semibold text-[#6e6e73] uppercase tracking-widest mt-2">{course.status}</span>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={() => navigate('/instructor/courses')} disabled={saving} className="btn-secondary !text-[#1d1d1f] disabled:opacity-50">Discard</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed">
            <Save size={16} /> {saving ? 'Saving...' : 'Apply Changes'}
          </button>
        </div>
      </div>

      {/* Segmented Control logic mimicking Apple tab filtering */}
      <div className="flex gap-2 p-1 bg-[#d2d2d7]/30 rounded-full w-fit mb-8">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-6 py-2.5 rounded-full text-[14px] font-medium transition-all ${
              activeTab === t.id ? 'bg-white text-[#1d1d1f] shadow-sm' : 'text-[#6e6e73] hover:text-[#1d1d1f]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      <div className="space-y-12">
        {activeTab === 'settings' && (
          <div className="animate-slide-up grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-12">
            <div className="space-y-8">
              <div>
                <h3 className="utility-heading text-[#1d1d1f] mb-4">Identity</h3>
                <div className="space-y-5">
                  <div>
                    <label className="control-label block mb-2 text-[#6e6e73]">Course Title *</label>
                    <input type="text" value={course.title} onChange={(e) => setCourse({ ...course, title: e.target.value })} placeholder="e.g., Advanced System Design" className="!text-[17px] !p-4" />
                  </div>
                  <div>
                    <label className="control-label block mb-2 text-[#6e6e73]">Full Editorial Description</label>
                    <textarea rows={6} value={course.description} onChange={(e) => setCourse({ ...course, description: e.target.value })} placeholder="Full narrative describing the course material..." />
                  </div>
                  <div>
                    <label className="control-label block mb-2 text-[#6e6e73]">Thumbnail URL</label>
                    <input type="url" value={course.thumbnailUrl} onChange={(e) => setCourse({ ...course, thumbnailUrl: e.target.value })} placeholder="https://example.com/image.jpg" className="w-full" />
                  </div>
                  <div>
                    <label className="control-label block mb-2 text-[#6e6e73]">Course Status</label>
                    <select value={course.status} onChange={(e) => setCourse({ ...course, status: e.target.value })} className="w-full">
                      <option value="DRAFT">Draft</option>
                      <option value="PUBLISHED">Published</option>
                      <option value="ARCHIVED">Archived</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <div className="apple-card p-6 border-none shadow-none text-center flex flex-col items-center">
                <CheckCircle size={32} className="text-[#0071e3] mb-4" />
                <h4 className="body-emphasis text-[#1d1d1f] mb-2">Ready to Deploy</h4>
                <p className="micro-ui text-[#6e6e73] mb-4">Once correctly configured, you can shift state to published.</p>
                <button 
                  onClick={handlePublish} 
                  disabled={saving || isNew || course.status === 'PUBLISHED'} 
                  className="btn-primary w-full shadow-md shadow-[#0071e3]/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  title={isNew ? 'Save course first' : course.status === 'PUBLISHED' ? 'Already published' : ''}
                >
                  {saving ? 'Publishing...' : course.status === 'PUBLISHED' ? 'Already Published' : 'Publish Course'}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'curriculum' && (
          <div className="animate-slide-up space-y-8">
            <div className="flex items-center justify-between">
              <h3 className="utility-heading text-[#1d1d1f]">Curriculum Architecture</h3>
              <button className="btn-primary !bg-[#f5f5f7] !text-[#1d1d1f] hover:!bg-[#e5e5ea]">
                <Plus size={16} /> Add Module
              </button>
            </div>
            <div className="apple-card p-12 text-center border-dashed border-2 border-[#d2d2d7]">
              <FileText size={40} className="mx-auto text-[#86868b] mb-4" />
              <h4 className="body-emphasis text-[#1d1d1f]">No Content Hierarchy</h4>
              <p className="body-primary text-[#6e6e73] max-w-sm mx-auto mb-6">Build your first module to begin layering content.</p>
              <button className="btn-primary"><Plus size={16} /> Create Module Step</button>
            </div>
          </div>
        )}

        {activeTab === 'media' && (
          <div className="animate-slide-up space-y-8">
            <h3 className="utility-heading text-[#1d1d1f]">Media & Presentation</h3>
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-4">
                <label className="control-label block text-[#6e6e73]">Store Thumbnail Cover</label>
                <div className="aspect-video bg-[#f5f5f7] border-2 border-dashed border-[#d2d2d7] rounded-[18px] flex flex-col items-center justify-center text-center p-6 group hover:border-[#0071e3] transition-colors cursor-pointer text-[#86868b] hover:text-[#0071e3]">
                  <Upload size={32} className="mb-4" />
                  <div className="body-emphasis mb-1">Click to browse or drag and drop</div>
                  <div className="micro-ui text-[#86868b]">1920x1080 JPEG or PNG (Max 5MB)</div>
                </div>
              </div>
              <div className="space-y-4">
                <label className="control-label block text-[#6e6e73]">Introductory Video Reel</label>
                <div className="aspect-video bg-[#f5f5f7] border-2 border-dashed border-[#d2d2d7] rounded-[18px] flex flex-col items-center justify-center text-center p-6 group hover:border-[#0071e3] transition-colors cursor-pointer text-[#86868b] hover:text-[#0071e3]">
                  <PlayCircle size={32} className="mb-4" />
                  <div className="body-emphasis mb-1">Select video reel</div>
                  <div className="micro-ui text-[#86868b]">MP4 or WebM (Max 50MB)</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
  
}
