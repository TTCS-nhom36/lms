import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '../../contexts/ToastContext';
import {
  Save, PlayCircle, FileText, Upload, Plus,
  Trash2, Edit, CheckCircle, ChevronLeft
} from 'lucide-react';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function CourseEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const isNew = id === 'new';

  const [loading, setLoading] = useState(!isNew);
  const [activeTab, setActiveTab] = useState('settings');
  const [course, setCourse] = useState({
    title: '', description: '', shortDescription: '', price: 0,
    thumbnailUrl: '', status: 'DRAFT', modules: []
  });

  useEffect(() => {
    if (!isNew) {
      setTimeout(() => { setLoading(false); }, 500); // mock load
    }
  }, [id, isNew]);

  const handleSave = async () => {
    toast.success('Course configuration saved');
  };

  if (loading) return <LoadingSpinner text="Loading environment..." />;

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
          <button onClick={() => navigate('/instructor/courses')} className="btn-secondary !text-[#1d1d1f]">Discard</button>
          <button onClick={handleSave} className="btn-primary">
            <Save size={16} /> Apply Changes
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
                    <label className="control-label block mb-2 text-[#6e6e73]">Course Title</label>
                    <input type="text" value={course.title} onChange={(e) => setCourse({ ...course, title: e.target.value })} placeholder="e.g., Advanced System Design" className="!text-[17px] !p-4" />
                  </div>
                  <div>
                    <label className="control-label block mb-2 text-[#6e6e73]">Short Overview</label>
                    <textarea rows={3} value={course.shortDescription} onChange={(e) => setCourse({ ...course, shortDescription: e.target.value })} placeholder="A brief hook for retail display." />
                  </div>
                  <div>
                    <label className="control-label block mb-2 text-[#6e6e73]">Full Editorial Description</label>
                    <textarea rows={6} value={course.description} onChange={(e) => setCourse({ ...course, description: e.target.value })} placeholder="Full narrative describing the course material..." />
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
              <div className="apple-card p-6 bg-[#f5f5f7] border-none shadow-none">
                <h3 className="utility-heading text-[#1d1d1f] mb-4 text-[20px]">Pricing Logic</h3>
                <div>
                  <label className="control-label block mb-2 text-[#6e6e73]">Retail Price ($)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#86868b] font-semibold">$</span>
                    <input type="number" value={course.price} onChange={(e) => setCourse({ ...course, price: parseFloat(e.target.value) })} className="!pl-8 !text-[20px] font-semibold !py-3" />
                  </div>
                </div>
              </div>
              <div className="apple-card p-6 border-none shadow-none text-center flex flex-col items-center">
                 <CheckCircle size={32} className="text-[#0071e3] mb-4" />
                 <h4 className="body-emphasis text-[#1d1d1f] mb-2">Ready to Deploy</h4>
                 <p className="micro-ui text-[#6e6e73] mb-4">Once correctly configured, you can shift state to published.</p>
                 <button className="btn-primary w-full shadow-md shadow-[#0071e3]/20">Publish Course</button>
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
            {course.modules?.length === 0 ? (
              <div className="apple-card p-12 text-center border-dashed border-2 border-[#d2d2d7]">
                <FileText size={40} className="mx-auto text-[#86868b] mb-4" />
                <h4 className="body-emphasis text-[#1d1d1f]">No Content Hierarchy</h4>
                <p className="body-primary text-[#6e6e73] max-w-sm mx-auto mb-6">Build your first module to begin layering content.</p>
                <button className="btn-primary"><Plus size={16} /> Create Module Step</button>
              </div>
            ) : null}
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
