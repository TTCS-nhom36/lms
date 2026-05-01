import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { courseApi } from '../../api/courseApi';
import { useToast } from '../../contexts/ToastContext';
import { Save, ChevronLeft, Plus, Upload, PlayCircle, CheckCircle, FileText } from 'lucide-react';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function CourseEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const isNew = id === 'new';

  const [loading, setLoading] = useState(!isNew);
  const [activeTab, setActiveTab] = useState('settings');
  const [course, setCourse] = useState({
    title: '',
    description: '',
    thumbnailUrl: '',
    status: 'DRAFT',
    shortDescription: '',
    price: 0,
    modules: [],
  });

  useEffect(() => {
    if (!isNew) {
      loadCourse();
    } else {
      setLoading(false);
    }
  }, [id, isNew]);

  const loadCourse = async () => {
    setLoading(true);
    try {
      const res = await courseApi.getById(id);
      const payload = res.data.course;
      setCourse({
        title: payload.title || '',
        description: payload.description || '',
        thumbnailUrl: payload.thumbnailUrl || '',
        status: payload.status || 'DRAFT',
        shortDescription: payload.description || '',
        price: 0,
        modules: [],
      });
    } catch (error) {
      toast.error('Failed to load course');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const payload = {
        title: course.title,
        description: course.description,
        thumbnailUrl: course.thumbnailUrl,
        status: course.status,
      };

      if (isNew) {
        await courseApi.create(payload);
        toast.success('Course created');
      } else {
        await courseApi.update(id, payload);
        toast.success('Course saved');
      }
      navigate('/instructor/courses');
    } catch (error) {
      toast.error('Failed to save course');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner text="Loading course editor..." />;

  const tabs = [
    { id: 'settings', label: 'Primary Settings' },
    { id: 'curriculum', label: 'Curriculum' },
    { id: 'media', label: 'Media' },
  ];

  return (
    <div className="max-w-[1024px] mx-auto space-y-8 pb-32 animate-fade-in">
      <div className="flex items-end justify-between border-b border-[#d2d2d7] pb-8">
        <div>
          <button onClick={() => navigate('/instructor/courses')} className="flex items-center gap-1 apple-link text-[14px] font-medium mb-4">
            <ChevronLeft size={16} /> Back to Courses
          </button>
          <div className="flex items-center gap-4">
            <h1 className="section-display text-[#1d1d1f]">{isNew ? 'Create Course' : 'Edit Course'}</h1>
            <span className="px-3 py-1 rounded-[6px] bg-[#f5f5f7] border border-[#d2d2d7] text-[11px] font-semibold text-[#6e6e73] uppercase tracking-widest mt-2">
              {course.status}
            </span>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={() => navigate('/instructor/courses')} className="btn-secondary !text-[#1d1d1f]">Discard</button>
          <button onClick={handleSave} className="btn-primary">
            <Save size={16} /> Save Course
          </button>
        </div>
      </div>

      <div className="flex gap-2 p-1 bg-[#d2d2d7]/30 rounded-full w-fit mb-8">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-2.5 rounded-full text-[14px] font-medium transition-all ${
              activeTab === tab.id ? 'bg-white text-[#1d1d1f] shadow-sm' : 'text-[#6e6e73] hover:text-[#1d1d1f]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'settings' && (
        <div className="animate-slide-up grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-12">
          <div className="space-y-8">
            <div>
              <h3 className="utility-heading text-[#1d1d1f] mb-4">Course Details</h3>
              <div className="space-y-5">
                <div>
                  <label className="control-label block mb-2 text-[#6e6e73]">Title</label>
                  <input
                    type="text"
                    value={course.title}
                    onChange={(e) => setCourse({ ...course, title: e.target.value })}
                    placeholder="Enter course title"
                  />
                </div>
                <div>
                  <label className="control-label block mb-2 text-[#6e6e73]">Description</label>
                  <textarea
                    rows={5}
                    value={course.description}
                    onChange={(e) => setCourse({ ...course, description: e.target.value })}
                    placeholder="Write a compelling course summary"
                  />
                </div>
                <div>
                  <label className="control-label block mb-2 text-[#6e6e73]">Thumbnail URL</label>
                  <input
                    type="url"
                    value={course.thumbnailUrl}
                    onChange={(e) => setCourse({ ...course, thumbnailUrl: e.target.value })}
                    placeholder="https://example.com/cover.jpg"
                  />
                </div>
                <div>
                  <label className="control-label block mb-2 text-[#6e6e73]">Status</label>
                  <select
                    value={course.status}
                    onChange={(e) => setCourse({ ...course, status: e.target.value })}
                    className="w-full"
                  >
                    <option value="DRAFT">Draft</option>
                    <option value="PUBLISHED">Published</option>
                    <option value="ARCHIVED">Archived</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <div className="apple-card p-6 bg-[#f5f5f7] border-none shadow-none">
              <h3 className="utility-heading text-[#1d1d1f] mb-4">Pricing</h3>
              <div>
                <label className="control-label block mb-2 text-[#6e6e73]">Suggested Price</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#86868b] font-semibold">$</span>
                  <input
                    type="number"
                    value={course.price}
                    onChange={(e) => setCourse({ ...course, price: parseFloat(e.target.value) || 0 })}
                    className="!pl-8 !text-[20px] font-semibold !py-3"
                  />
                </div>
              </div>
            </div>
            <div className="apple-card p-6 border-none shadow-none text-center flex flex-col items-center">
              <CheckCircle size={32} className="text-[#0071e3] mb-4" />
              <h4 className="body-emphasis text-[#1d1d1f] mb-2">Course ready</h4>
              <p className="micro-ui text-[#6e6e73] mb-4">Save your changes to update the course record on the platform.</p>
              <button onClick={handleSave} className="btn-primary">
                <Save size={16} /> Save Course
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'curriculum' && (
        <div className="animate-slide-up space-y-8">
          <div className="flex items-center justify-between">
            <h3 className="utility-heading text-[#1d1d1f]">Curriculum</h3>
            <button className="btn-primary !bg-[#f5f5f7] !text-[#1d1d1f] hover:!bg-[#e5e5ea]">
              <Plus size={16} /> Add Module
            </button>
          </div>
          {course.modules?.length === 0 ? (
            <div className="apple-card p-12 text-center border-dashed border-2 border-[#d2d2d7]">
              <FileText size={40} className="mx-auto text-[#86868b] mb-4" />
              <h4 className="body-emphasis text-[#1d1d1f]">No modules yet</h4>
              <p className="body-primary text-[#6e6e73] max-w-sm mx-auto mb-6">Use the curriculum tab to add chapters and lessons to your course.</p>
              <button className="btn-primary"><Plus size={16} /> Add New Module</button>
            </div>
          ) : (
            <div className="space-y-4">
              {course.modules.map((module, index) => (
                <div key={index} className="card p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-[#1d1d1f]">{module.title}</h4>
                      <p className="text-xs text-[#6e6e73]">{module.lessons?.length || 0} lessons</p>
                    </div>
                    <button className="btn-secondary text-sm">Edit</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'media' && (
        <div className="animate-slide-up space-y-8">
          <h3 className="utility-heading text-[#1d1d1f]">Media</h3>
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-4">
              <label className="control-label block text-[#6e6e73]">Thumbnail cover</label>
              <div className="aspect-video bg-[#f5f5f7] border-2 border-dashed border-[#d2d2d7] rounded-[18px] flex flex-col items-center justify-center text-center p-6 group hover:border-[#0071e3] transition-colors cursor-pointer text-[#86868b] hover:text-[#0071e3]">
                <Upload size={32} className="mb-4" />
                <div className="body-emphasis mb-1">Add a cover image</div>
                <div className="micro-ui text-[#86868b]">1920x1080 JPEG or PNG</div>
              </div>
            </div>
            <div className="space-y-4">
              <label className="control-label block text-[#6e6e73]">Introductory video</label>
              <div className="aspect-video bg-[#f5f5f7] border-2 border-dashed border-[#d2d2d7] rounded-[18px] flex flex-col items-center justify-center text-center p-6 group hover:border-[#0071e3] transition-colors cursor-pointer text-[#86868b] hover:text-[#0071e3]">
                <PlayCircle size={32} className="mb-4" />
                <div className="body-emphasis mb-1">Add a promo video</div>
                <div className="micro-ui text-[#86868b]">MP4 or WebM upload support</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
