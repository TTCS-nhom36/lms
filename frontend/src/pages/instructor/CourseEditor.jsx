import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '../../contexts/ToastContext';
import {
  Save, PlayCircle, FileText, Upload, Plus,
  Trash2, Edit, CheckCircle, ChevronLeft, X, ChevronDown, AlertCircle, Users, Eye
} from 'lucide-react';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { courseApi } from '../../api/courseApi';
import { chapterApi } from '../../api/chapterApi';
import { lessonApi } from '../../api/lessonApi';
import { attemptApi } from '../../api/attemptApi';
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

  // Curriculum state
  const [chapters, setChapters] = useState([]);
  const [expandedChapters, setExpandedChapters] = useState({});
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [showChapterModal, setShowChapterModal] = useState(false);
  const [newChapterTitle, setNewChapterTitle] = useState('');
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [selectedChapterId, setSelectedChapterId] = useState(null);
  const [newLessonTitle, setNewLessonTitle] = useState('');
  //
  const [newLessonContentType, setNewLessonContentType] = useState('TEXT');
  const [lessonTextContent, setLessonTextContent] = useState('');
  const [lessoncontentUrl, setLessoncontentUrl] = useState('');
  const [lessonQuestions, setLessonQuestions] = useState([]);
  
  const [lessonDocumentUrl, setLessonDocumentUrl] = useState('');
  const [lessonLinkUrl, setLessonLinkUrl] = useState('');
  const [lessonNotebookUrl, setLessonNotebookUrl] = useState('');
  
  //
  const resetLessonForm = () => {
    setNewLessonTitle('');
    setNewLessonContentType('TEXT');
    setLessonTextContent('');
    setLessoncontentUrl('');
    setLessonDocumentUrl('');
    setLessonLinkUrl('');
    setLessonNotebookUrl('');
    setSelectedChapterId(null);
  };
  // Students state
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  
  // Delete confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmType, setDeleteConfirmType] = useState(null); // 'chapter' or 'lesson'
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');

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
      // Load chapters and students for this course
      loadChapters(id);
      loadStudents(id);
    } catch (error) {
      console.error('Failed to load course:', error);
      toast.error('Failed to load course');
      setTimeout(() => navigate('/instructor/courses'), 1500);
    } finally {
      setLoading(false);
    }
  }, [id, toast, navigate]);

  // Load chapters for the course
  const loadChapters = useCallback(async (courseId) => {
    setLoadingChapters(true);
    try {
      const res = await chapterApi.getByCourse(courseId);
      const chapterList = res.data || [];
      setChapters(res.data || []);
      const chaptersWithLessons = await Promise.all(
        chapterList.map(async (chapter) => {
          try {
            const lessonRes = await lessonApi.getByChapter(chapter.id);

            return {
              ...chapter,
              lessons: lessonRes.data || []
            };
          } catch (error) {
            console.error(
              `Failed to load lessons for chapter ${chapter.id}`,
              error
            );

            return {
              ...chapter,
              lessons: []
            };
          }
        })
      );

      setChapters(chaptersWithLessons);
    } catch (error) {
      console.error('Failed to load chapters:', error);
      toast.error('Failed to load chapters');
    } finally {
      setLoadingChapters(false);
    }
  }, [toast]);

  // Load students for the course
  const loadStudents = useCallback(async (courseId) => {
    setLoadingStudents(true);
    try {
      const res = await courseApi.getStudents(courseId);
      setStudents(res.data || []);
    } catch (error) {
      console.error('Failed to load students:', error);
      // Don't show error toast for students, it's optional
    } finally {
      setLoadingStudents(false);
    }
  }, []);

  // Create new chapter
  const handleCreateChapter = async () => {
    if (!newChapterTitle.trim()) {
      toast.error('Chapter title is required');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: newChapterTitle,
        courseId: id,
        orderIndex: chapters.length
      };
      await chapterApi.create(id, payload);
      toast.success('Chapter created successfully');
      setNewChapterTitle('');
      setShowChapterModal(false);
      await loadChapters(id);
    } catch (error) {
      console.error('Create chapter error:', error);
      const message = error.response?.data?.message || 'Failed to create chapter';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  // Delete chapter
  const handleDeleteChapter = async (chapterId) => {
    const chapter = chapters.find(ch => ch.id === chapterId);
    setDeleteConfirmType('chapter');
    setDeleteConfirmId(chapterId);
    setDeleteConfirmName(chapter?.title || 'Chapter');
    setShowDeleteConfirm(true);
  };

  // Confirm delete chapter
  const confirmDeleteChapter = async () => {
    setSaving(true);
    try {
      await chapterApi.delete(deleteConfirmId);
      toast.success('Chapter deleted successfully');
      setShowDeleteConfirm(false);
      setDeleteConfirmId(null);
      setDeleteConfirmName('');
      await loadChapters(id);
    } catch (error) {
      console.error('Delete chapter error:', error);
      const message = error.response?.data?.message || 'Failed to delete chapter';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  // Create new lesson
  const handleCreateLesson = async () => {
    if (!newLessonTitle.trim()) {
      toast.error("Lesson title is required");
      return;
    }

    if (
      newLessonContentType === "VIDEO" &&
      !lessoncontentUrl.trim()
    ) {
      toast.error("Video URL is required");
      return;
    }
    if (
      newLessonContentType === "DOCUMENT" &&
      !lessonDocumentUrl.trim()
    ) {
      toast.error("Document URL is required");
      return;
    }

    if (
      newLessonContentType === "LINK" &&
      !lessonLinkUrl.trim()
    ) {
      toast.error("Link URL is required");
      return;
    }

    if (
      newLessonContentType === "NOTEBOOK" &&
      !lessonNotebookUrl.trim()
    ) {
      toast.error("Notebook URL is required");
      return;
    }

    setSaving(true);

    try {
      const currentChapter = chapters.find(
        (ch) => ch.id === selectedChapterId
      );

      const lessonCount =
        currentChapter?.lessons?.length || 0;

      let formattedcontentUrl = null;

      // chuẩn hóa giống admin
      if (newLessonContentType === "VIDEO") {
        const url = lessoncontentUrl.trim();

        if (url.includes("youtube.com/watch?v=")) {
          const videoId = new URL(url).searchParams.get("v");
          formattedcontentUrl = `https://www.youtube.com/embed/${videoId}`;
        } else if (url.includes("youtu.be/")) {
          const videoId = url.split("youtu.be/")[1];
          formattedcontentUrl = `https://www.youtube.com/embed/${videoId}`;
        } else {
          formattedcontentUrl = url;
        }
      }

      const payload = {
        title: newLessonTitle,
        chapterId: selectedChapterId,
        orderIndex: lessonCount,

        contentType: newLessonContentType,

        contentText:
          newLessonContentType === "TEXT"
            ? lessonTextContent
            : null,

        contentUrl:
          newLessonContentType === "VIDEO"
            ? formattedcontentUrl
            : newLessonContentType === "DOCUMENT"
            ? lessonDocumentUrl
            : newLessonContentType === "LINK"
            ? lessonLinkUrl
            : newLessonContentType === "NOTEBOOK"
            ? lessonNotebookUrl
            : null,

        unlockConditionId: null,
        isFreePreview: false
      };

      console.log("Sending lesson payload:", payload);

      await lessonApi.create(selectedChapterId, payload);

      // reload lại data chuẩn từ backend
      await loadChapters(id);

      toast.success("Lesson created successfully");

      resetLessonForm();
      setShowLessonModal(false);
    } catch (error) {
      console.error("Create lesson error:", error);

      toast.error(
        error.response?.data?.message ||
        "Failed to create lesson"
      );

    } finally {
      setSaving(false);
    }
  };

  // Delete lesson
  const handleDeleteLesson = async (lessonId, chapterId) => {
    const chapter = chapters.find(ch => ch.id === chapterId);
    const lesson = chapter?.lessons?.find(l => l.id === lessonId);
    setDeleteConfirmType('lesson');
    setDeleteConfirmId(lessonId);
    setDeleteConfirmName(lesson?.title || 'Lesson');
    setShowDeleteConfirm(true);
  };

  // Confirm delete lesson
  const confirmDeleteLesson = async () => {
    setSaving(true);
    try {
      await lessonApi.delete(deleteConfirmId);
      toast.success('Lesson deleted successfully');
      setShowDeleteConfirm(false);
      setDeleteConfirmId(null);
      setDeleteConfirmName('');
      await loadChapters(id);
    } catch (error) {
      console.error('Delete lesson error:', error);
      const message = error.response?.data?.message || 'Failed to delete lesson';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  // Toggle chapter expansion
  const toggleChapterExpanded = (chapterId) => {
    setExpandedChapters(prev => ({
      ...prev,
      [chapterId]: !prev[chapterId]
    }));
  };

  // Open lesson modal for specific chapter
  // Open lesson modal
  const openLessonModal = (chapterId) => {
    setSelectedChapterId(chapterId);
    setShowLessonModal(true);
  };

  // Add question
  const addQuestion = () => {
    setLessonQuestions(prev => [
      ...prev,
      {
        question: '',
        options: ['', '', '', ''],
        correctAnswer: ''
      }
    ]);
  };

  // Update question text/correct answer
  const updateQuestion = (index, field, value) => {
    setLessonQuestions(prev =>
      prev.map((q, i) =>
        i === index
          ? { ...q, [field]: value }
          : q
      )
    );
  };

  // Update option
  const updateOption = (questionIndex, optionIndex, value) => {
    setLessonQuestions(prev =>
      prev.map((q, i) => {
        if (i !== questionIndex) return q;

        const updatedOptions = [...q.options];
        updatedOptions[optionIndex] = value;

        return {
          ...q,
          options: updatedOptions
        };
      })
    );
  };

  // Remove question
  const removeQuestion = (index) => {
    setLessonQuestions(prev =>
      prev.filter((_, i) => i !== index)
    );
  };

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

    // Validate user before making request
    if (!user || !user.id) {
      toast.error('User information not loaded. Please refresh and try again.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: course.title,
        description: course.description,
        thumbnailUrl: course.thumbnailUrl,
        status: course.status,
        createdById: user.id
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
    { id: 'students', label: 'Students' },
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
              <button 
                onClick={() => setShowChapterModal(true)}
                disabled={saving || isNew}
                className="btn-primary !bg-[#f5f5f7] !text-[#1d1d1f] hover:!bg-[#e5e5ea] disabled:opacity-50"
                title={isNew ? 'Save course first' : ''}
              >
                <Plus size={16} /> Add Chapter
              </button>
            </div>
            
            {loadingChapters ? (
              <LoadingSpinner text="Loading chapters..." />
            ) : chapters.length === 0 ? (
              <div className="apple-card p-12 text-center border-dashed border-2 border-[#d2d2d7]">
                <FileText size={40} className="mx-auto text-[#86868b] mb-4" />
                <h4 className="body-emphasis text-[#1d1d1f]">No Chapters Yet</h4>
                <p className="body-primary text-[#6e6e73] max-w-sm mx-auto mb-6">Build your first chapter to begin organizing your course content.</p>
                <button 
                  onClick={() => setShowChapterModal(true)}
                  disabled={isNew}
                  className="btn-primary disabled:opacity-50"
                  title={isNew ? 'Save course first' : ''}
                >
                  <Plus size={16} /> Create Chapter
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {chapters.map((chapter) => (
                  <div key={chapter.id} className="apple-card p-6 border-l-4 border-[#0071e3]">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4 flex-1">
                        <button 
                          onClick={() => toggleChapterExpanded(chapter.id)}
                          className="text-[#0071e3] hover:text-[#0077ed] transition-colors"
                        >
                          <ChevronDown 
                            size={20} 
                            className={`transition-transform ${expandedChapters[chapter.id] ? 'rotate-180' : ''}`}
                          />
                        </button>
                        <div>
                          <h4 className="body-emphasis text-[#1d1d1f]">{chapter.title}</h4>
                          <p className="micro-ui text-[#86868b]">{chapter.lessons?.length || 0} lessons</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => openLessonModal(chapter.id)}
                          className="p-2 hover:bg-[#f5f5f7] rounded-lg transition-colors text-[#0071e3] hover:text-[#0077ed]"
                          title="Add lesson"
                        >
                          <Plus size={18} />
                        </button>
                        <button 
                          onClick={() => handleDeleteChapter(chapter.id)}
                          disabled={saving}
                          className="p-2 hover:bg-[#f5f5f7] rounded-lg transition-colors text-[#ff3b30] hover:text-[#ff453a] disabled:opacity-50"
                          title="Delete chapter"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>

                    {expandedChapters[chapter.id] && (
                      <div className="mt-4 pl-6 border-l border-[#d2d2d7] space-y-2">
                        {chapter.lessons && chapter.lessons.length > 0 ? (
                          chapter.lessons.map((lesson) => (
                            <div key={lesson.id} className="flex items-center justify-between p-3 bg-[#f5f5f7] rounded-lg">
                              <div>
                                <p className="body-primary text-[#1d1d1f]">{lesson.title}</p>
                              </div>
                              <button 
                                onClick={() => handleDeleteLesson(lesson.id, chapter.id)}
                                disabled={saving}
                                className="p-1 hover:bg-white rounded transition-colors text-[#ff3b30] hover:text-[#ff453a] disabled:opacity-50"
                                title="Delete lesson"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          ))
                        ) : (
                          <p className="text-[#86868b] text-sm italic">No lessons yet. Add one using the + button above.</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
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

        {activeTab === 'students' && (
          <div className="animate-slide-up space-y-8">
            <div className="flex items-center justify-between">
              <h3 className="utility-heading text-[#1d1d1f]">Enrolled Students</h3>
              <span className="px-3 py-1 rounded-[6px] bg-[#f5f5f7] border border-[#d2d2d7] text-[11px] font-semibold text-[#6e6e73] uppercase tracking-widest">
                {students.length} students
              </span>
            </div>

            {loadingStudents ? (
              <LoadingSpinner text="Loading students..." />
            ) : students.length === 0 ? (
              <div className="apple-card p-12 text-center border-dashed border-2 border-[#d2d2d7]">
                <Users size={40} className="mx-auto text-[#86868b] mb-4" />
                <h4 className="body-emphasis text-[#1d1d1f]">No Students Yet</h4>
                <p className="body-primary text-[#6e6e73] max-w-sm mx-auto">Students will appear here once they enroll in your course.</p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-[#f5f5f7] border-b border-[#d2d2d7]">
                      <tr>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#6e6e73] uppercase tracking-wide">Name</th>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#6e6e73] uppercase tracking-wide">Email</th>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#6e6e73] uppercase tracking-wide">Status</th>
                        <th className="px-4 py-3 text-center text-[11px] font-semibold text-[#6e6e73] uppercase tracking-wide">Progress</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#d2d2d7]">
                      {students.map((student) => (
                        <tr key={student.id} className="hover:bg-[#f5f5f7] transition-colors">
                          <td className="px-4 py-3 body-primary text-[#1d1d1f]">{student.fullName || 'N/A'}</td>
                          <td className="px-4 py-3 body-primary text-[#6e6e73]">{student.email || 'N/A'}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-block px-2.5 py-1 rounded-[6px] text-[11px] font-semibold ${
                              student.enrollmentStatus === 'ACTIVE' 
                                ? 'bg-[#34C759]/10 text-[#34C759]' 
                                : 'bg-[#FF3B30]/10 text-[#FF3B30]'
                            }`}>
                              {student.enrollmentStatus || 'UNKNOWN'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-[#6e6e73] text-xs">
                              {student.completedLessons ? `${student.completedLessons} lessons` : '0 lessons'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Chapter Modal */}
      {showChapterModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[18px] shadow-xl max-w-md w-full p-8 animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h3 className="utility-heading text-[#1d1d1f]">Create Chapter</h3>
              <button 
                onClick={() => {
                  setShowChapterModal(false);
                  setNewChapterTitle('');
                }}
                className="text-[#86868b] hover:text-[#1d1d1f] transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="control-label block mb-2 text-[#6e6e73]">Chapter Title *</label>
                <input 
                  type="text" 
                  value={newChapterTitle} 
                  onChange={(e) => setNewChapterTitle(e.target.value)}
                  placeholder="e.g., Chapter 1: Introduction"
                  className="w-full"
                  onKeyPress={(e) => e.key === 'Enter' && handleCreateChapter()}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => {
                  setShowChapterModal(false);
                  setNewChapterTitle('');
                }}
                disabled={saving}
                className="btn-secondary flex-1 !text-[#1d1d1f] disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreateChapter}
                disabled={saving || !newChapterTitle.trim()}
                className="btn-primary flex-1 disabled:opacity-50"
              >
                {saving ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Lesson Modal */}
      {showLessonModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[18px] shadow-xl max-w-md w-full p-8 animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h3 className="utility-heading text-[#1d1d1f]">Create Lesson</h3>
              <button 
                onClick={() => {
                  setShowLessonModal(false);
                  setShowLessonModal(false);
                  resetLessonForm();
                }}
                className="text-[#86868b] hover:text-[#1d1d1f] transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="control-label block mb-2 text-[#6e6e73]">Chapter</label>
                <div className="p-3 bg-[#f5f5f7] rounded-lg text-[#1d1d1f]">
                  {chapters.find(ch => ch.id === selectedChapterId)?.title}
                </div>
              </div>
              <div>
                <label className="control-label block mb-2 text-[#6e6e73]">Lesson Title *</label>
                <input 
                  type="text" 
                  value={newLessonTitle} 
                  onChange={(e) => setNewLessonTitle(e.target.value)}
                  placeholder="e.g., Lesson 1: Getting Started"
                  className="w-full"
                  onKeyPress={(e) => e.key === 'Enter' && handleCreateLesson()}
                />
              </div>
              <div>
                <label className="control-label block mb-2 text-[#6e6e73]">Content Type *</label>
                <select 
                  value={newLessonContentType} 
                  onChange={(e) => setNewLessonContentType(e.target.value)}
                  className="w-full"
                >
                  <option value="TEXT">Text</option>
                  <option value="VIDEO">Video</option>
                  <option value="DOCUMENT">Document</option>
                  <option value="LINK">Link</option>
                  <option value="NOTEBOOK">Notebook</option>
                </select>
              </div>  
              {/* TEXT */}
              {newLessonContentType === 'TEXT' && (
                <div>
                  <label className="control-label block mb-2 text-[#6e6e73]">
                    Lesson Content
                  </label>

                  <textarea
                    rows={6}
                    value={lessonTextContent}
                    onChange={(e) =>
                      setLessonTextContent(e.target.value)
                    }
                    placeholder="Enter lesson content..."
                    className="w-full"
                  />
                </div>
              )}

              {/* VIDEO */}
              {newLessonContentType === 'VIDEO' && (
                <div>
                  <label className="control-label block mb-2 text-[#6e6e73]">
                    Video URL
                  </label>

                  <input
                    type="url"
                    value={lessoncontentUrl}
                    onChange={(e) =>
                      setLessoncontentUrl(e.target.value)
                    }
                    placeholder="https://youtube.com/..."
                    className="w-full"
                  />
                </div>
              )}

              {/* QUIZ + ASSIGNMENT */}
              {newLessonContentType === 'DOCUMENT' && (
                <div>
                  <label className="control-label block mb-2 text-[#6e6e73]">
                    Document URL
                  </label>

                  <input
                    type="url"
                    value={lessonDocumentUrl}
                    onChange={(e) => setLessonDocumentUrl(e.target.value)}
                    placeholder="https://example.com/document.pdf"
                    className="w-full"
                  />
                </div>
              )}
              {newLessonContentType === 'LINK' && (
                <div>
                  <label className="control-label block mb-2 text-[#6e6e73]">
                    External Link
                  </label>

                  <input
                    type="url"
                    value={lessonLinkUrl}
                    onChange={(e) => setLessonLinkUrl(e.target.value)}
                    placeholder="https://example.com"
                    className="w-full"
                  />
                </div>
              )}
              {newLessonContentType === 'NOTEBOOK' && (
                <div>
                  <label className="control-label block mb-2 text-[#6e6e73]">
                    Notebook URL
                  </label>

                  <input
                    type="url"
                    value={lessonNotebookUrl}
                    onChange={(e) => setLessonNotebookUrl(e.target.value)}
                    placeholder="https://colab.research.google.com/..."
                    className="w-full"
                  />
                </div>
              )}
                
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => {
                  setShowLessonModal(false);
                  resetLessonForm();
                }}
                disabled={saving}
                className="btn-secondary flex-1 !text-[#1d1d1f] disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreateLesson}
                disabled={saving || !newLessonTitle.trim()}
                className="btn-primary flex-1 disabled:opacity-50"
              >
                {saving ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[18px] shadow-xl max-w-md w-full p-8 animate-slide-up">
            <div className="flex justify-center mb-6">
              <div className="w-12 h-12 rounded-full bg-[#ff3b30]/10 flex items-center justify-center">
                <AlertCircle size={24} className="text-[#ff3b30]" />
              </div>
            </div>
            
            <div className="text-center mb-6">
              <h3 className="utility-heading text-[#1d1d1f] mb-2">
                Delete {deleteConfirmType === 'chapter' ? 'Chapter' : 'Lesson'}?
              </h3>
              <p className="body-primary text-[#6e6e73]">
                "{deleteConfirmName}" {deleteConfirmType === 'chapter' ? 'and all its lessons will be permanently deleted' : 'will be permanently deleted'}.
              </p>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteConfirmId(null);
                  setDeleteConfirmName('');
                  setDeleteConfirmType(null);
                }}
                disabled={saving}
                className="btn-secondary flex-1 !text-[#1d1d1f] disabled:opacity-50"
              >
                Keep
              </button>
              <button 
                onClick={deleteConfirmType === 'chapter' ? confirmDeleteChapter : confirmDeleteLesson}
                disabled={saving}
                className="btn-primary flex-1 !bg-[#ff3b30] hover:!bg-[#ff453a] disabled:opacity-50"
              >
                {saving ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
  
}
