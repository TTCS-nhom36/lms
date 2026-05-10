import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '../../contexts/ToastContext';
import {
  Save, PlayCircle, FileText, Upload, Plus,
  Trash2, Edit, CheckCircle, ChevronLeft, X, ChevronDown, AlertCircle, Users, Eye,
  ClipboardList, Calendar, Clock, Star, Download, Search, MessageSquare,
  Link as LinkIcon, BookOpen, Video, FileCode
} from 'lucide-react';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import StatusBadge from '../../components/ui/StatusBadge';
import { courseApi } from '../../api/courseApi';
import { chapterApi } from '../../api/chapterApi';
import { lessonApi } from '../../api/lessonApi';
import { assignmentApi } from '../../api/assignmentApi';
import { submissionApi, questionApi } from '../../api/submissionApi';
import { useAuth } from '../../contexts/AuthContext';

export default function CourseEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const isNew = !id || id === 'new';

  // Stable refs to avoid re-creating callbacks when toast/navigate change identity
  const toastRef = useRef(toast);
  const navigateRef = useRef(navigate);
  useEffect(() => { toastRef.current = toast; }, [toast]);
  useEffect(() => { navigateRef.current = navigate; }, [navigate]);

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [activeTab, setActiveTab] = useState('curriculum');
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
  //Create Lesson
  const [newLessonContentType, setNewLessonContentType] = useState('TEXT');
  const [lessonTextContent, setLessonTextContent] = useState('');
  const [lessoncontentUrl, setLessoncontentUrl] = useState('');
  const [lessonQuestions, setLessonQuestions] = useState([]);

  const [lessonDocumentUrl, setLessonDocumentUrl] = useState('');
  const [lessonDocumentFileName, setLessonDocumentFileName] = useState('');
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [lessonLinkUrl, setLessonLinkUrl] = useState('');
  const [lessonNotebookUrl, setLessonNotebookUrl] = useState('');
  //Editting chapter
  const [editingChapter, setEditingChapter] = useState(null);

  //Editting lesson
  const [editingLesson, setEditingLesson] = useState(null);

  //
  const resetLessonForm = () => {
    setNewLessonTitle('');
    setNewLessonContentType('TEXT');
    setLessonTextContent('');
    setLessoncontentUrl('');
    setLessonDocumentUrl('');
    setLessonDocumentFileName('');
    setLessonLinkUrl('');
    setLessonNotebookUrl('');
    setSelectedChapterId(null);
    setEditingLesson(null);
  };
  // Students / Gradebook state
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [gradebookData, setGradebookData] = useState(null);
  const [loadingGradebook, setLoadingGradebook] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showStudentDetail, setShowStudentDetail] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Assignment state
  const [assignments, setAssignments] = useState([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [assignmentForm, setAssignmentForm] = useState({
    title: '', description: '', type: 'QUIZ', dueDate: '',
    allowLate: false, maxScore: 100, weight: 1, timeLimitMins: 0,
    shuffleQuestions: false, shuffleOptions: false,
  });
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [showQuestionFormModal, setShowQuestionFormModal] = useState(false);
  const [questionAssignment, setQuestionAssignment] = useState(null);
  const [questionAssignmentDetails, setQuestionAssignmentDetails] = useState(null);
  const [questionLoading, setQuestionLoading] = useState(false);
  const [questionForm, setQuestionForm] = useState({ content: '', type: 'SINGLE_CHOICE', orderIndex: 1, score: 1, options: [{ content: '', isCorrect: false }, { content: '', isCorrect: false }] });
  const [questionSaving, setQuestionSaving] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null); // null = adding mode, object = editing mode
  const [showAssignmentDeleteConfirm, setShowAssignmentDeleteConfirm] = useState(false);
  const [deleteAssignmentId, setDeleteAssignmentId] = useState(null);

  // Delete course state
  const [showDeleteCourseConfirm, setShowDeleteCourseConfirm] = useState(false);

  // Delete confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmType, setDeleteConfirmType] = useState(null); // 'chapter' or 'lesson'
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');

  //Reorder
  const moveItem = (arr, from, to) => {
    const newArr = [...arr];
    const [removed] = newArr.splice(from, 1);
    newArr.splice(to, 0, removed);
    return newArr;
  };

  // Load course data if editing
  const loadCourse = useCallback(async () => {
    setLoading(true);
    try {
      const res = await courseApi.getById(id);
      const courseData = res.data.course || res.data; // Fallback if it's already flat
      setCourse({
        ...courseData,
        title: courseData.title || '',
        description: courseData.description || '',
        thumbnailUrl: courseData.thumbnailUrl || '',
        status: courseData.status || 'DRAFT'
      });
      // Load chapters, students, assignments, gradebook for this course
      loadChapters(id);
      loadStudents(id);
      loadAssignments(id);
      loadGradebook(id);
    } catch (error) {
      console.error('Failed to load course:', error);
      toastRef.current.error('Failed to load course');
      setTimeout(() => navigateRef.current('/admin/courses'), 1500);
    } finally {
      setLoading(false);
    }
  }, [id]);

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
    } finally {
      setLoadingStudents(false);
    }
  }, []);

  // Load gradebook data
  const loadGradebook = useCallback(async (courseId) => {
    setLoadingGradebook(true);
    try {
      const res = await courseApi.getGradebook(courseId);
      setGradebookData(res.data);
    } catch (error) {
      console.error('Failed to load gradebook:', error);
    } finally {
      setLoadingGradebook(false);
    }
  }, []);

  // Load assignments
  const loadAssignments = useCallback(async (courseId) => {
    setLoadingAssignments(true);
    try {
      const res = await assignmentApi.getByCourse(courseId);
      setAssignments(res.data || []);
    } catch (error) {
      console.error('Failed to load assignments:', error);
      toast.error('Failed to load assignments');
    } finally {
      setLoadingAssignments(false);
    }
  }, [toast]);

  // Filtered gradebook entries
  const filteredGradebook = useMemo(() => {
    if (!gradebookData?.entries) return [];
    return gradebookData.entries.filter(e =>
      e.fullName?.toLowerCase().includes(studentSearch.toLowerCase()) ||
      e.email?.toLowerCase().includes(studentSearch.toLowerCase())
    );
  }, [gradebookData, studentSearch]);

  const formatScore = (score) => {
    if (score == null) return '—';
    const n = Number(score);
    return isNaN(n) ? '—' : n.toFixed(1);
  };
  const getScoreColor = (score) => {
    if (score == null) return 'text-[#86868b]';
    const n = Number(score);
    if (n >= 8) return 'text-[#34C759]';
    if (n >= 5) return 'text-[#FF9500]';
    return 'text-[#FF3B30]';
  };

  // Create or Update chapter
  const handleSaveChapter = async () => {
    if (!newChapterTitle.trim()) {
      toast.error('Chapter title is required');
      return;
    }

    setSaving(true);
    try {
      if (editingChapter) {
        const payload = {
          title: newChapterTitle,
          courseId: id,
          orderIndex: editingChapter.orderIndex
        };
        await chapterApi.update(editingChapter.id, payload);
        toast.success('Chapter updated successfully');
      } else {
        const payload = {
          title: newChapterTitle,
          courseId: id,
          orderIndex: chapters.length
        };
        await chapterApi.create(id, payload);
        toast.success('Chapter created successfully');
      }
      setNewChapterTitle('');
      setEditingChapter(null);
      setShowChapterModal(false);
      await loadChapters(id);
    } catch (error) {
      console.error('Save chapter error:', error);
      const message = error.response?.data?.message || 'Failed to save chapter';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const openEditChapterModal = (chapter) => {
    setEditingChapter(chapter);
    setNewChapterTitle(chapter.title);
    setShowChapterModal(true);
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
  //Reorder chapter
  const handleMoveChapter = async (index, direction) => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;

    if (newIndex < 0 || newIndex >= chapters.length) return;

    const reordered = moveItem(chapters, index, newIndex);

    const updated = reordered.map((c, i) => ({
      ...c,
      orderIndex: i
    }));

    setChapters(updated);

    try {
      await chapterApi.reorder({
        chapterIds: updated.map(c => c.id)
      });
    } catch (err) {
      console.error(err);
      toast.error("Reorder failed");
    }
  };

  // Create new lesson
  const handleSaveLesson = async () => {
    if (!newLessonTitle.trim()) {
      toast.error("Lesson title is required");
      return;
    }

    setSaving(true);

    try {
      const currentChapter = chapters.find(
        ch => ch.id === selectedChapterId
      );

      const lessonCount =
        currentChapter?.lessons?.length || 0;

      let formattedcontentUrl = null;

      if (newLessonContentType === "VIDEO") {
        const url = lessoncontentUrl.trim();

        if (url.includes("youtube.com/watch?v=")) {
          const videoId = new URL(url).searchParams.get("v");
          formattedcontentUrl =
            `https://www.youtube.com/embed/${videoId}`;
        } else if (url.includes("youtu.be/")) {
          const videoId = url.split("youtu.be/")[1];
          formattedcontentUrl =
            `https://www.youtube.com/embed/${videoId}`;
        } else {
          formattedcontentUrl = url;
        }
      }

      const payload = {
        title: newLessonTitle,
        chapterId: selectedChapterId,
        orderIndex: editingLesson
          ? editingLesson.orderIndex
          : lessonCount,

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

      if (editingLesson) {
        await lessonApi.update(editingLesson.id, payload);
        toast.success("Lesson updated successfully");
      } else {
        await lessonApi.create(selectedChapterId, payload);
        toast.success("Lesson created successfully");
      }

      await loadChapters(id);

      resetLessonForm();
      setShowLessonModal(false);

    } catch (error) {
      console.error(error);
      toast.error(
        error.response?.data?.message ||
        "Failed to save lesson"
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
  //
  const openEditLessonModal = (lesson, chapterId) => {
    setEditingLesson(lesson);
    setSelectedChapterId(chapterId);

    setNewLessonTitle(lesson.title || "");
    setNewLessonContentType(lesson.contentType || "TEXT");
    setLessonTextContent(lesson.contentText || "");

    if (lesson.contentType === "VIDEO") {
      setLessoncontentUrl(lesson.contentUrl || "");
    }

    if (lesson.contentType === 'DOCUMENT') {
      setLessonDocumentUrl(lesson.contentUrl || '');
      // Try to extract filename from s3 key (format: lesson-documents/uuid_filename.pdf)
      const key = lesson.contentUrl || '';
      const parts = key.split('_');
      const name = parts.length > 1 ? parts.slice(1).join('_') : key.split('/').pop();
      setLessonDocumentFileName(name || '');
    }

    if (lesson.contentType === "LINK") {
      setLessonLinkUrl(lesson.contentUrl || "");
    }

    if (lesson.contentType === "NOTEBOOK") {
      setLessonNotebookUrl(lesson.contentUrl || "");
    }

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



  // === Assignment handlers ===
  const handleCreateAssignment = () => {
    setEditingAssignment(null);
    setAssignmentForm({ title: '', description: '', type: 'QUIZ', dueDate: '', allowLate: false, maxScore: 100, weight: 1, timeLimitMins: 0, shuffleQuestions: false, shuffleOptions: false });
    setShowAssignmentModal(true);
  };
  const handleEditAssignment = (a) => {
    setEditingAssignment(a);
    setAssignmentForm({ title: a.title || '', description: a.description || '', type: a.type, dueDate: a.dueDate ? a.dueDate.substring(0, 16) : '', allowLate: a.allowLate || false, maxScore: a.maxScore || 100, weight: a.weight || 1, timeLimitMins: a.timeLimitMins || 0, shuffleQuestions: a.shuffleQuestions || false, shuffleOptions: a.shuffleOptions || false });
    setShowAssignmentModal(true);
  };
  const handleSaveAssignment = async () => {
    if (!assignmentForm.title.trim()) { toast.error('Title is required'); return; }
    setSaving(true);
    try {
      const payload = {
        ...assignmentForm,
        courseId: Number(id), // Include courseId (id is the courseId in CourseEditor)
        createdById: String(user.id),
        dueDate: assignmentForm.dueDate ? assignmentForm.dueDate + ':00' : null
      };
      if (editingAssignment) {
        await assignmentApi.update(editingAssignment.id, payload);
        toast.success('Assignment updated');
      } else {
        await assignmentApi.create(id, payload);
        toast.success('Assignment created');
      }
      setShowAssignmentModal(false);
      loadAssignments(id);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to save assignment');
    } finally { setSaving(false); }
  };
  const handleDeleteAssignment = async () => {
    if (!deleteAssignmentId) return;
    setSaving(true);
    try {
      await assignmentApi.delete(deleteAssignmentId);
      toast.success('Assignment deleted');
      setShowAssignmentDeleteConfirm(false);
      loadAssignments(id);
    } catch (error) { toast.error('Failed to delete'); }
    finally { setSaving(false); }
  };
  const openQuestionModal = async (assignment) => {
    setQuestionAssignment(assignment);
    setQuestionAssignmentDetails(null);
    setEditingQuestion(null);
    setQuestionLoading(true);
    try {
      const [res, qRes] = await Promise.all([
        assignmentApi.getById(assignment.id),
        assignmentApi.getQuestions(assignment.id)
      ]);
      setQuestionAssignmentDetails({
        ...res.data,
        questions: qRes.data || []
      });
    } catch { setQuestionAssignmentDetails(assignment); }
    finally { setQuestionLoading(false); setQuestionForm({ content: '', type: 'SINGLE_CHOICE', orderIndex: 1, score: 1, options: [{ content: '', isCorrect: false }, { content: '', isCorrect: false }] }); setShowQuestionModal(true); }
  };
  const handleAddQuestion = async () => {
    if (!questionForm.content.trim()) { toast.error('Question content is required'); return; }
    if (questionForm.options.length < 2) { toast.error('At least 2 options are required'); return; }
    if (questionForm.options.some(o => !o.content.trim())) { toast.error('Option content cannot be empty'); return; }
    if (!questionForm.options.some(o => o.isCorrect)) { toast.error('Please select at least one correct option'); return; }

    setQuestionSaving(true);
    try {
      const res = await assignmentApi.addQuestion(questionAssignment.id, {
        content: questionForm.content,
        type: questionForm.type,
        orderIndex: Number(questionForm.orderIndex),
        score: Number(questionForm.score),
        options: questionForm.options.map((opt, idx) => ({ content: opt.content, isCorrect: opt.isCorrect, orderIndex: idx + 1 }))
      });
      const newQuestion = res.data;
      toast.success('Question added');
      setShowQuestionFormModal(false);
      setQuestionForm({ content: '', type: 'SINGLE_CHOICE', orderIndex: (questionAssignmentDetails?.questions?.length || 0) + 2, score: 1, options: [{ content: '', isCorrect: false }, { content: '', isCorrect: false }] });
      if (questionAssignmentDetails) {
        setQuestionAssignmentDetails({
          ...questionAssignmentDetails,
          questions: [...(questionAssignmentDetails.questions || []), newQuestion]
        });
      }
    } catch { toast.error('Failed to add question'); }
    finally { setQuestionSaving(false); }
  };

  const handleUpdateQuestion = async () => {
    if (!editingQuestion?.id) return;
    if (!questionForm.content.trim()) { toast.error('Question content is required'); return; }
    if (questionForm.options.length < 2) { toast.error('At least 2 options are required'); return; }
    if (questionForm.options.some(o => !o.content.trim())) { toast.error('Option content cannot be empty'); return; }
    if (!questionForm.options.some(o => o.isCorrect)) { toast.error('Please select at least one correct option'); return; }
    setQuestionSaving(true);
    try {
      const res = await questionApi.update(editingQuestion.id, {
        assignmentId: questionAssignment.id,
        content: questionForm.content,
        type: questionForm.type,
        orderIndex: Number(questionForm.orderIndex),
        score: Number(questionForm.score),
        options: questionForm.options.map((opt, idx) => ({ content: opt.content, isCorrect: opt.isCorrect, orderIndex: idx + 1 }))
      });
      const updated = res.data;
      toast.success('Question updated');
      setEditingQuestion(null);
      setShowQuestionFormModal(false);
      setQuestionForm({ content: '', type: 'SINGLE_CHOICE', orderIndex: 1, score: 1, options: [{ content: '', isCorrect: false }, { content: '', isCorrect: false }] });
      if (questionAssignmentDetails) {
        setQuestionAssignmentDetails({
          ...questionAssignmentDetails,
          questions: questionAssignmentDetails.questions.map(q => q.id === updated.id ? updated : q)
        });
      }
    } catch (error) {
      console.error('Failed to update question:', error.response?.data || error.message);
      toast.error(error.response?.data?.message || 'Failed to update question');
    }
    finally { setQuestionSaving(false); }
  };

  // === Gradebook handlers ===
  const handleDeleteQuestion = async (questionId) => {
    if (!questionId) return;
    try {
      await questionApi.delete(questionId);
      toast.success('Question deleted');
      if (questionAssignmentDetails) {
        setQuestionAssignmentDetails({
          ...questionAssignmentDetails,
          questions: questionAssignmentDetails.questions.filter(q => q.id !== questionId),
        });
      }
    } catch (error) {
      console.error('Failed to delete question:', error);
      toast.error('Failed to delete question');
    }
  };

  const handleExportGradebook = async () => {
    setExporting(true);
    try {
      const res = await courseApi.exportGradebook(id);
      const url = window.URL.createObjectURL(res.data);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `gradebook-course-${id}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Gradebook exported');
    } catch { toast.error('Failed to export'); }
    finally { setExporting(false); }
  };

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
        createdById: course.createdById || user.id
      };

      if (isNew) {
        await courseApi.create(payload);
        toast.success('Course created successfully');
        navigate('/admin/courses');
      } else {
        await courseApi.update(id, payload);
        toast.success('Course updated successfully');
      }
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

  const handleDeleteCourse = async () => {
    setSaving(true);
    try {
      await courseApi.delete(id);
      toast.success('Course deleted successfully');
      navigate('/admin/courses');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(error.response?.data?.message || 'Failed to delete course');
    } finally {
      setSaving(false);
      setShowDeleteCourseConfirm(false);
    }
  };

  if (loading) return <LoadingSpinner text="Loading course..." />;

  const tabs = [
    { id: 'curriculum', label: 'Curriculum Model' },
    { id: 'assignments', label: 'Assignments' },
    { id: 'students', label: 'Students' },
    { id: 'settings', label: 'Primary Settings' },
  ];

  const contentTypeIcon = (type) => {
    const icons = { TEXT: FileText, VIDEO: Video, DOCUMENT: FileCode, LINK: LinkIcon, NOTEBOOK: BookOpen };
    const Icon = icons[type] || FileText;
    return <Icon size={14} />;
  };

  return (
    <div className="max-w-[1024px] mx-auto space-y-8 pb-32 animate-fade-in">
      {/* Editorial Header */}
      <div className="flex items-end justify-between border-b border-[#d2d2d7] pb-8">
        <div>
          <button onClick={() => navigate('/admin/courses')} className="flex items-center gap-1 apple-link text-[14px] font-medium mb-4">
            <ChevronLeft size={16} /> Back to Courses
          </button>
          <div className="flex items-center gap-4">
            <h1 className="section-display text-[#1d1d1f]">{isNew ? 'Create Course' : 'Configure Course'}</h1>
            <span className="px-3 py-1 rounded-[6px] bg-[#f5f5f7] border border-[#d2d2d7] text-[11px] font-semibold text-[#6e6e73] uppercase tracking-widest mt-2">{course.status}</span>
          </div>
        </div>
        {activeTab === 'settings' && (
          <div className="flex gap-3">
            {!isNew && (
              <button
                onClick={() => setShowDeleteCourseConfirm(true)}
                disabled={saving}
                className="btn-secondary !text-[#ff3b30] hover:!bg-[#ff3b30]/10 border-[#ff3b30]/30 disabled:opacity-50"
              >
                Delete Course
              </button>
            )}
            <button onClick={() => navigate('/admin/courses')} disabled={saving} className="btn-secondary !text-[#1d1d1f] disabled:opacity-50">Discard</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed">
              <Save size={16} /> {saving ? 'Saving...' : 'Apply Changes'}
            </button>
          </div>
        )}
      </div>

      {/* Segmented Control logic mimicking Apple tab filtering */}
      <div className="flex gap-2 p-1 bg-[#d2d2d7]/30 rounded-full w-fit mb-8">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-6 py-2.5 rounded-full text-[14px] font-medium transition-all ${activeTab === t.id ? 'bg-white text-[#1d1d1f] shadow-sm' : 'text-[#6e6e73] hover:text-[#1d1d1f]'
              }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      <div className="space-y-12">
        {activeTab === 'settings' && (
          <div className="animate-slide-up grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-8">
            <div className="space-y-6">
              <div className="apple-card p-8">
                <div className="flex items-center gap-3 mb-8 pb-4 border-b border-[#f5f5f7]">
                  <div className="w-10 h-10 rounded-xl bg-[#0071e3]/10 flex items-center justify-center text-[#0071e3]">
                    <BookOpen size={20} />
                  </div>
                  <div>
                    <h3 className="text-[19px] font-semibold text-[#1d1d1f]">Course Identity</h3>
                    <p className="text-[13px] text-[#6e6e73]">Define the core metadata for your educational program.</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="text-[13px] font-semibold text-[#1d1d1f] block mb-2 ml-1">Course Title *</label>
                    <input
                      type="text"
                      value={course.title}
                      onChange={(e) => setCourse({ ...course, title: e.target.value })}
                      placeholder="e.g., Mastering Modern UI Design"
                      className="!text-[16px] !p-4 !bg-[#f5f5f7] border-none focus:!bg-white focus:ring-2 focus:ring-[#0071e3]/20 transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-[13px] font-semibold text-[#1d1d1f] block mb-2 ml-1">Editorial Description</label>
                    <textarea
                      rows={6}
                      value={course.description}
                      onChange={(e) => setCourse({ ...course, description: e.target.value })}
                      placeholder="Describe the learning outcomes and target audience..."
                      className="!text-[15px] !p-4 !bg-[#f5f5f7] border-none focus:!bg-white focus:ring-2 focus:ring-[#0071e3]/20 transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="text-[13px] font-semibold text-[#1d1d1f] block mb-2 ml-1">Course Thumbnail</label>
                        {!course.thumbnailUrl ? (
                          <div
                            className="relative border-2 border-dashed border-[#d2d2d7] rounded-xl p-6 text-center hover:border-[#0071e3] hover:bg-[#0071e3]/5 transition-all cursor-pointer"
                            onClick={() => document.getElementById('admin-thumbnail-upload').click()}
                            onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-[#0071e3]', 'bg-[#0071e3]/5'); }}
                            onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove('border-[#0071e3]', 'bg-[#0071e3]/5'); }}
                            onDrop={async (e) => {
                              e.preventDefault();
                              e.currentTarget.classList.remove('border-[#0071e3]', 'bg-[#0071e3]/5');
                              const file = e.dataTransfer.files[0];
                              if (!file) return;
                              if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
                              setUploadingThumbnail(true);
                              try {
                                const res = await courseApi.uploadThumbnail(file);
                                setCourse(prev => ({ ...prev, thumbnailUrl: res.data.url }));
                                toast.success('Thumbnail uploaded — click Apply Changes to save');
                              } catch { toast.error('Failed to upload thumbnail'); }
                              finally { setUploadingThumbnail(false); }
                            }}
                          >
                            <input
                              id="admin-thumbnail-upload"
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={async (e) => {
                                const file = e.target.files[0];
                                if (!file) return;
                                if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
                                setUploadingThumbnail(true);
                                try {
                                  const res = await courseApi.uploadThumbnail(file);
                                  setCourse(prev => ({ ...prev, thumbnailUrl: res.data.url }));
                                  toast.success('Thumbnail uploaded — click Apply Changes to save');
                                } catch { toast.error('Failed to upload thumbnail'); }
                                finally { setUploadingThumbnail(false); e.target.value = ''; }
                              }}
                            />
                            {uploadingThumbnail ? (
                              <div className="flex flex-col items-center gap-2 py-4">
                                <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
                                <p className="text-[13px] text-[#0071e3] font-medium">Uploading...</p>
                              </div>
                            ) : (
                              <>
                                <Upload size={28} className="mx-auto text-[#86868b] mb-2" />
                                <p className="text-[14px] font-medium text-[#1d1d1f]">Drop image here or click to upload</p>
                                <p className="text-[12px] text-[#86868b] mt-1">PNG, JPG, WebP up to 10MB</p>
                              </>
                            )}
                          </div>
                        ) : (
                          <div className="relative group overflow-hidden rounded-xl border border-[#f5f5f7] bg-white aspect-video flex items-center justify-center">
                            <img
                              src={course.thumbnailUrl}
                              alt="Course Preview"
                              className="w-full h-full object-cover transition-transform group-hover:scale-105"
                              onError={(e) => e.target.src = 'https://placehold.co/600x400?text=Invalid+Image'}
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); document.getElementById('admin-thumbnail-replace').click(); }}
                                  className="px-3 py-1.5 bg-white/90 backdrop-blur rounded-lg text-[12px] font-semibold text-[#1d1d1f] hover:bg-white transition-all"
                                >
                                  Replace
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); setCourse(prev => ({ ...prev, thumbnailUrl: '' })); }}
                                  className="px-3 py-1.5 bg-[#ff3b30]/90 backdrop-blur rounded-lg text-[12px] font-semibold text-white hover:bg-[#ff3b30] transition-all"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                            <input
                              id="admin-thumbnail-replace"
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={async (e) => {
                                const file = e.target.files[0];
                                if (!file) return;
                                if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
                                setUploadingThumbnail(true);
                                try {
                                  const res = await courseApi.uploadThumbnail(file);
                                  setCourse(prev => ({ ...prev, thumbnailUrl: res.data.url }));
                                  toast.success('Thumbnail replaced — click Apply Changes to save');
                                } catch { toast.error('Failed to upload thumbnail'); }
                                finally { setUploadingThumbnail(false); e.target.value = ''; }
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="space-y-6">
                      <div>
                        <label className="text-[13px] font-semibold text-[#1d1d1f] block mb-2 ml-1">Initial Status</label>
                        <select
                          value={course.status}
                          onChange={(e) => setCourse({ ...course, status: e.target.value })}
                          className="w-full !bg-[#f5f5f7] border-none focus:!bg-white focus:ring-2 focus:ring-[#0071e3]/20 transition-all"
                        >
                          <option value="DRAFT">Draft</option>
                          <option value="PUBLISHED">Published</option>
                          <option value="ARCHIVED">Archived</option>
                        </select>
                      </div>

                      {!isNew && (
                        <div className="p-4 rounded-xl bg-[#0071e3]/5 border border-[#0071e3]/10">
                          <h4 className="text-[12px] font-bold text-[#0071e3] uppercase tracking-wider mb-2">Structure Overview</h4>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-[20px] font-bold text-[#1d1d1f]">{chapters.length}</p>
                              <p className="text-[11px] text-[#6e6e73]">Chapters</p>
                            </div>
                            <div>
                              <p className="text-[20px] font-bold text-[#1d1d1f]">{chapters.reduce((acc, c) => acc + (c.lessons?.length || 0), 0)}</p>
                              <p className="text-[11px] text-[#6e6e73]">Total Lessons</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
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
                {chapters.map((chapter, index) => (
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
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleMoveChapter(index, 'up')}
                            disabled={index === 0}
                            className="p-2 text-[#0071e3] disabled:opacity-30"
                            title="Move Up"
                          >
                            ↑
                          </button>

                          <button
                            onClick={() => handleMoveChapter(index, 'down')}
                            disabled={index === chapters.length - 1}
                            className="p-2 text-[#0071e3] disabled:opacity-30"
                            title="Move Down"
                          >
                            ↓
                          </button>
                        </div>
                        <button
                          onClick={() => openLessonModal(chapter.id)}
                          className="p-2 hover:bg-[#f5f5f7] rounded-lg transition-colors text-[#0071e3] hover:text-[#0077ed]"
                          title="Add lesson"
                        >
                          <Plus size={18} />
                        </button>
                        <button
                          onClick={() => openEditChapterModal(chapter)}
                          className="p-2 hover:bg-[#f5f5f7] rounded-lg transition-colors text-[#0071e3]"
                          title="Edit chapter"
                        >
                          <Edit size={18} />
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
                              <div className="flex items-center gap-3">
                                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white border border-[#d2d2d7] text-[#6e6e73] text-[10px] font-semibold uppercase">
                                  {contentTypeIcon(lesson.contentType)} {lesson.contentType || 'TEXT'}
                                </span>
                                <p className="body-primary text-[#1d1d1f]">{lesson.title}</p>
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => openEditLessonModal(lesson, chapter.id)}
                                  disabled={saving}
                                  className="p-1 hover:bg-white rounded transition-colors text-[#0071e3] disabled:opacity-50"
                                  title="Edit lesson"
                                >
                                  <Edit size={16} />
                                </button>
                                <button
                                  onClick={() => handleDeleteLesson(lesson.id, chapter.id)}
                                  disabled={saving}
                                  className="p-1 hover:bg-white rounded transition-colors text-[#ff3b30] hover:text-[#ff453a] disabled:opacity-50"
                                  title="Delete lesson"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
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

        {activeTab === 'assignments' && (
          <div className="animate-slide-up space-y-8">
            <div className="flex items-center justify-between">
              <h3 className="utility-heading text-[#1d1d1f]">Assignments</h3>
              <button onClick={handleCreateAssignment} disabled={saving || isNew} className="btn-primary !bg-[#f5f5f7] !text-[#1d1d1f] hover:!bg-[#e5e5ea] disabled:opacity-50">
                <Plus size={16} /> New Assignment
              </button>
            </div>

            {loadingAssignments ? (
              <LoadingSpinner text="Loading assignments..." />
            ) : assignments.length === 0 ? (
              <div className="apple-card p-12 text-center border-dashed border-2 border-[#d2d2d7]">
                <ClipboardList size={40} className="mx-auto text-[#86868b] mb-4" />
                <h4 className="body-emphasis text-[#1d1d1f]">No Assignments Yet</h4>
                <p className="body-primary text-[#6e6e73] max-w-sm mx-auto mb-6">Create your first assignment for this course.</p>
                <button onClick={handleCreateAssignment} disabled={isNew} className="btn-primary disabled:opacity-50"><Plus size={16} /> Create Assignment</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {assignments.map((a, i) => (
                  <div key={a.id} className="apple-card p-5 animate-slide-up" style={{ animationDelay: `${i * 0.04}s` }}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="body-emphasis text-[#1d1d1f] truncate">{a.title}</h4>
                        <p className="micro-ui text-[#86868b] mt-0.5 line-clamp-2">{a.description || 'No description'}</p>
                      </div>
                      <StatusBadge status={a.type} size="xs" />
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-[#86868b] mb-3">
                      {a.dueDate && <span className="flex items-center gap-1"><Calendar size={11} /> {new Date(a.dueDate).toLocaleString('vi-VN')}</span>}
                      {a.timeLimitMins > 0 && <span className="flex items-center gap-1"><Clock size={11} /> {a.timeLimitMins} min</span>}
                      <span>Max: {a.maxScore}</span>
                    </div>
                    <div className="flex items-center gap-1 pt-3 border-t border-[#f5f5f7]">
                      {a.type === 'QUIZ' && (
                        <button onClick={() => openQuestionModal(a)} className="px-3 py-1.5 rounded-lg text-[#0071e3] hover:bg-[#0071e3]/5 transition-colors text-[11px] font-semibold">
                          <Plus size={12} className="inline-block mr-1" /> Questions
                        </button>
                      )}
                      <button onClick={() => navigate(`/admin/courses/${id}/submissions/${a.id}`)} className="px-3 py-1.5 rounded-lg text-[#1d1d1f] hover:bg-[#f5f5f7] transition-colors text-[11px] font-semibold flex items-center gap-1" title="View Submissions">
                        <Eye size={12} /> View Submissions
                      </button>
                      <button onClick={() => handleEditAssignment(a)} className="p-1.5 rounded-lg text-[#86868b] hover:text-[#FF9500] hover:bg-[#FF9500]/5 transition-colors" title="Edit">
                        <Edit size={14} />
                      </button>
                      <button onClick={() => { setDeleteAssignmentId(a.id); setShowAssignmentDeleteConfirm(true); }} className="p-1.5 rounded-lg text-[#86868b] hover:text-[#ff3b30] hover:bg-[#ff3b30]/5 transition-colors ml-auto" title="Delete">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'students' && (
          <div className="animate-slide-up space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="utility-heading text-[#1d1d1f]">Enrolled Students & Gradebook</h3>
                <p className="micro-ui text-[#86868b] mt-1">{gradebookData?.entries?.length || 0} students</p>
              </div>
              <button onClick={handleExportGradebook} disabled={exporting || !gradebookData?.entries?.length} className="btn-primary !bg-[#f5f5f7] !text-[#1d1d1f] hover:!bg-[#e5e5ea] disabled:opacity-50">
                <Download size={14} /> {exporting ? 'Exporting...' : 'Export Excel'}
              </button>
            </div>

            {/* Search */}
            <div className="apple-card p-4">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-3 text-[#86868b]" />
                <input type="text" placeholder="Search by name or email..." value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)} className="w-full !pl-10" />
              </div>
            </div>

            {loadingGradebook ? (
              <LoadingSpinner text="Loading gradebook..." />
            ) : !gradebookData?.entries?.length ? (
              <div className="apple-card p-12 text-center border-dashed border-2 border-[#d2d2d7]">
                <Users size={40} className="mx-auto text-[#86868b] mb-4" />
                <h4 className="body-emphasis text-[#1d1d1f]">No Students Yet</h4>
                <p className="body-primary text-[#6e6e73] max-w-sm mx-auto">Students will appear here once they enroll in your course.</p>
              </div>
            ) : (
              <div className="apple-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-[#f5f5f7] border-b border-[#d2d2d7]">
                      <tr>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#6e6e73] uppercase tracking-wide">Student</th>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#6e6e73] uppercase tracking-wide">Email</th>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#6e6e73] uppercase tracking-wide">Status</th>
                        <th className="px-4 py-3 text-center text-[11px] font-semibold text-[#6e6e73] uppercase tracking-wide">Submitted</th>
                        <th className="px-4 py-3 text-center text-[11px] font-semibold text-[#6e6e73] uppercase tracking-wide">Progress</th>
                        <th className="px-4 py-3 text-center text-[11px] font-semibold text-[#6e6e73] uppercase tracking-wide">Avg Score</th>
                        <th className="px-4 py-3 text-center text-[11px] font-semibold text-[#6e6e73] uppercase tracking-wide">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#d2d2d7]">
                      {filteredGradebook.map((e) => (
                        <tr key={e.userId} className="hover:bg-[#f5f5f7] transition-colors">
                          <td className="px-4 py-3 body-primary text-[#1d1d1f] font-medium">{e.fullName}</td>
                          <td className="px-4 py-3 body-primary text-[#6e6e73]">{e.email}</td>
                          <td className="px-4 py-3"><StatusBadge status={e.enrollmentStatus} size="xs" /></td>
                          <td className="px-4 py-3 text-center text-[#1d1d1f] font-medium">{e.submittedAssignments}/{e.totalAssignments}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-[#d2d2d7] rounded-full overflow-hidden">
                                <div className="h-full bg-[#0071e3] rounded-full transition-all" style={{ width: e.totalAssignments > 0 ? `${(e.submittedAssignments / e.totalAssignments) * 100}%` : '0%' }} />
                              </div>
                              <span className="text-[10px] text-[#86868b] w-8">{e.totalAssignments > 0 ? `${Math.round((e.submittedAssignments / e.totalAssignments) * 100)}%` : '0%'}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center"><span className={`font-semibold ${getScoreColor(e.averageScore)}`}>{formatScore(e.averageScore)}</span></td>
                          <td className="px-4 py-3 text-center">
                            <button onClick={() => { setSelectedStudent(e); setShowStudentDetail(true); }} className="text-[#0071e3] hover:text-[#0077ed] text-xs font-medium">Details</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredGradebook.length === 0 && <div className="px-6 py-8 text-center"><p className="text-[#86868b] text-sm">No students found matching your search.</p></div>}
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
              <h3 className="utility-heading text-[#1d1d1f]">{editingChapter ? 'Edit Chapter' : 'Create Chapter'}</h3>
              <button
                onClick={() => {
                  setShowChapterModal(false);
                  setNewChapterTitle('');
                  setEditingChapter(null);
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
                  onKeyPress={(e) => e.key === 'Enter' && handleSaveChapter()}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowChapterModal(false);
                  setNewChapterTitle('');
                  setEditingChapter(null);
                }}
                disabled={saving}
                className="btn-secondary flex-1 !text-[#1d1d1f] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveChapter}
                disabled={saving || !newChapterTitle.trim()}
                className="btn-primary flex-1 disabled:opacity-50"
              >
                {saving ? 'Saving...' : editingChapter ? 'Update' : 'Create'}
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
                  onKeyPress={(e) => e.key === 'Enter' && handleSaveLesson()}
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

              {/* DOCUMENT – PDF upload */}
              {newLessonContentType === 'DOCUMENT' && (
                <div>
                  <label className="control-label block mb-2 text-[#6e6e73]">
                    PDF Document <span className="text-[#86868b] font-normal">(max 25 MB)</span>
                  </label>
                  {lessonDocumentUrl ? (
                    /* Already uploaded */
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-[#f5f5f7] border border-[#d2d2d7]">
                      <FileCode size={20} className="text-[#0071e3] shrink-0" />
                      <span className="text-[13px] text-[#1d1d1f] truncate flex-1">
                        {lessonDocumentFileName || 'document.pdf'}
                      </span>
                      <button
                        type="button"
                        onClick={() => { setLessonDocumentUrl(''); setLessonDocumentFileName(''); }}
                        className="p-1 hover:bg-[#d2d2d7] rounded-lg transition-colors text-[#ff3b30]"
                        title="Remove file"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    /* Upload area */
                    <div
                      className="relative border-2 border-dashed border-[#d2d2d7] rounded-xl p-6 text-center hover:border-[#0071e3] hover:bg-[#0071e3]/5 transition-all cursor-pointer"
                      onClick={() => !uploadingDocument && document.getElementById('admin-lesson-doc-upload').click()}
                      onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-[#0071e3]', 'bg-[#0071e3]/5'); }}
                      onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove('border-[#0071e3]', 'bg-[#0071e3]/5'); }}
                      onDrop={async (e) => {
                        e.preventDefault();
                        e.currentTarget.classList.remove('border-[#0071e3]', 'bg-[#0071e3]/5');
                        const file = e.dataTransfer.files[0];
                        if (!file) return;
                        if (file.type !== 'application/pdf') { toast.error('Chỉ chấp nhận file PDF'); return; }
                        if (file.size > 25 * 1024 * 1024) { toast.error('File không được vượt quá 25 MB'); return; }
                        setUploadingDocument(true);
                        try {
                          const res = await lessonApi.uploadDocument(file);
                          setLessonDocumentUrl(res.data.s3Key);
                          setLessonDocumentFileName(file.name);
                          toast.success('Tải tài liệu thành công');
                        } catch { toast.error('Tải tài liệu thất bại'); }
                        finally { setUploadingDocument(false); }
                      }}
                    >
                      <input
                        id="admin-lesson-doc-upload"
                        type="file"
                        accept="application/pdf"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files[0];
                          if (!file) return;
                          if (file.type !== 'application/pdf') { toast.error('Chỉ chấp nhận file PDF'); e.target.value = ''; return; }
                          if (file.size > 25 * 1024 * 1024) { toast.error('File không được vượt quá 25 MB'); e.target.value = ''; return; }
                          setUploadingDocument(true);
                          try {
                            const res = await lessonApi.uploadDocument(file);
                            setLessonDocumentUrl(res.data.s3Key);
                            setLessonDocumentFileName(file.name);
                            toast.success('Tải tài liệu thành công');
                          } catch { toast.error('Tải tài liệu thất bại'); }
                          finally { setUploadingDocument(false); e.target.value = ''; }
                        }}
                      />
                      {uploadingDocument ? (
                        <div className="flex flex-col items-center gap-2 py-2">
                          <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
                          <p className="text-[13px] text-[#0071e3] font-medium">Đang tải lên...</p>
                        </div>
                      ) : (
                        <>
                          <Upload size={24} className="mx-auto text-[#86868b] mb-2" />
                          <p className="text-[14px] font-medium text-[#1d1d1f]">Kéo thả PDF vào đây hoặc click để chọn</p>
                          <p className="text-[12px] text-[#86868b] mt-1">Chỉ PDF • Tối đa 25 MB</p>
                        </>
                      )}
                    </div>
                  )}
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
                onClick={handleSaveLesson}
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
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setDeleteConfirmId(null);
          setDeleteConfirmName('');
          setDeleteConfirmType(null);
        }}
        onConfirm={deleteConfirmType === 'chapter' ? confirmDeleteChapter : confirmDeleteLesson}
        title={`Delete ${deleteConfirmType === 'chapter' ? 'Chapter' : 'Lesson'}?`}
        message={`"${deleteConfirmName}" ${deleteConfirmType === 'chapter' ? 'and all its lessons will be permanently deleted' : 'will be permanently deleted'}.`}
        confirmText={saving ? "Deleting..." : "Delete"}
        isDanger={true}
      />

      {/* Assignment Modal */}
      <Modal isOpen={showAssignmentModal} onClose={() => setShowAssignmentModal(false)} title={editingAssignment ? 'Edit Assignment' : 'New Assignment'} size="lg">
        <div className="space-y-4">
          <div><label className="control-label block mb-2 text-[#6e6e73]">Title *</label><input type="text" value={assignmentForm.title} onChange={(e) => setAssignmentForm({ ...assignmentForm, title: e.target.value })} placeholder="Assignment title" /></div>
          <div><label className="control-label block mb-2 text-[#6e6e73]">Description</label><textarea rows={3} value={assignmentForm.description} onChange={(e) => setAssignmentForm({ ...assignmentForm, description: e.target.value })} placeholder="Describe the assignment..." /></div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="control-label block mb-2 text-[#6e6e73]">Type</label>
              <select value={assignmentForm.type} onChange={(e) => setAssignmentForm({ ...assignmentForm, type: e.target.value })}>
                <option value="QUIZ">Quiz</option><option value="FILE_UPLOAD">File Upload</option><option value="LINK_SUBMIT">Link Submit</option>
              </select>
            </div>
            <div><label className="control-label block mb-2 text-[#6e6e73]">Max Score</label><input type="number" value={assignmentForm.maxScore} onChange={(e) => setAssignmentForm({ ...assignmentForm, maxScore: parseFloat(e.target.value) })} /></div>
            <div><label className="control-label block mb-2 text-[#6e6e73]">Weight</label><input type="number" step="0.1" value={assignmentForm.weight} onChange={(e) => setAssignmentForm({ ...assignmentForm, weight: parseFloat(e.target.value) })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="control-label block mb-2 text-[#6e6e73]">Due Date</label><input type="datetime-local" value={assignmentForm.dueDate} onChange={(e) => setAssignmentForm({ ...assignmentForm, dueDate: e.target.value })} /></div>
            <div><label className="control-label block mb-2 text-[#6e6e73]">Time Limit (min)</label><input type="number" value={assignmentForm.timeLimitMins} onChange={(e) => setAssignmentForm({ ...assignmentForm, timeLimitMins: parseInt(e.target.value) })} /></div>
          </div>
          <div className="flex items-center gap-5 flex-wrap">
            <label className="flex items-center gap-1.5 text-sm text-[#6e6e73] cursor-pointer"><input type="checkbox" checked={assignmentForm.allowLate} onChange={(e) => setAssignmentForm({ ...assignmentForm, allowLate: e.target.checked })} className="!w-4 !h-4 accent-[#0071e3]" /> Allow Late</label>
            <label className="flex items-center gap-1.5 text-sm text-[#6e6e73] cursor-pointer"><input type="checkbox" checked={assignmentForm.shuffleQuestions} onChange={(e) => setAssignmentForm({ ...assignmentForm, shuffleQuestions: e.target.checked })} className="!w-4 !h-4 accent-[#0071e3]" /> Shuffle Questions</label>
            <label className="flex items-center gap-1.5 text-sm text-[#6e6e73] cursor-pointer"><input type="checkbox" checked={assignmentForm.shuffleOptions} onChange={(e) => setAssignmentForm({ ...assignmentForm, shuffleOptions: e.target.checked })} className="!w-4 !h-4 accent-[#0071e3]" /> Shuffle Options</label>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-[#f5f5f7]">
            <button onClick={() => setShowAssignmentModal(false)} className="btn-secondary !text-[#1d1d1f]">Cancel</button>
            <button onClick={handleSaveAssignment} disabled={saving} className="btn-primary disabled:opacity-50">{saving ? 'Saving...' : editingAssignment ? 'Update' : 'Create'}</button>
          </div>
        </div>
      </Modal>

      {/* Question Modal */}
      <Modal isOpen={showQuestionModal} onClose={() => { setShowQuestionModal(false); setEditingQuestion(null); }} title={questionAssignment ? `Questions — ${questionAssignment.title}` : 'Manage Questions'} size="lg">
        <div className="space-y-4">
          {questionLoading ? (
            <LoadingSpinner text="Loading questions..." />
          ) : (
            <>
              <div className="flex justify-between items-center mb-3">
                <h4 className="body-emphasis text-[#1d1d1f]">Existing Questions ({questionAssignmentDetails?.questions?.length || 0})</h4>
                <button onClick={() => { setEditingQuestion(null); setQuestionForm({ content: '', type: 'SINGLE_CHOICE', orderIndex: (questionAssignmentDetails?.questions?.length || 0) + 1, score: 1, options: [{ content: '', isCorrect: false }, { content: '', isCorrect: false }] }); setShowQuestionFormModal(true); }} className="btn-primary"><Plus size={14} className="inline-block mr-1" /> Add Question</button>
              </div>
              {questionAssignmentDetails?.questions?.length ? (
                <div className="space-y-3">
                  {questionAssignmentDetails.questions.map((q, idx) => (
                    <div key={q.id || idx} className={`p-3 rounded-lg border transition-colors ${editingQuestion?.id === q.id ? 'bg-[#0071e3]/5 border-[#0071e3]/30' : 'bg-[#f5f5f7] border-transparent'}`}>
                      <div className="flex items-center justify-between mb-2 text-[11px] text-[#86868b]">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-[#1d1d1f]">Q{idx + 1}.</span>
                          <span className="px-1.5 py-0.5 rounded bg-white border border-[#d2d2d7]">{q.type}</span>
                          <span>Score: {q.score ?? '—'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setEditingQuestion(q);
                              setQuestionForm({
                                content: q.content || '',
                                type: q.type || 'SINGLE_CHOICE',
                                orderIndex: q.orderIndex || idx + 1,
                                score: q.score || 1,
                                options: q.options?.map(o => ({ content: o.content, isCorrect: o.isCorrect || false })) || [{ content: '', isCorrect: false }, { content: '', isCorrect: false }]
                              });
                              setShowQuestionFormModal(true);
                            }}
                            className="text-[#0071e3] hover:bg-[#0071e3]/10 p-1 rounded transition-colors" title="Edit Question"
                          >
                            <Edit size={12} />
                          </button>
                          <button onClick={() => handleDeleteQuestion(q.id)} className="text-[#86868b] hover:text-[#ff3b30] p-1 rounded transition-colors" title="Delete Question">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                      <p className="body-primary text-[#1d1d1f] mb-2">{q.content || 'No content'}</p>
                      {q.options && q.options.length > 0 && (
                        <div className="space-y-1 pl-2 border-l-2 border-[#d2d2d7]">
                          {q.options.map((opt, oi) => (
                            <div key={opt.id || oi} className={`flex items-center gap-2 text-[12px] px-2 py-1 rounded ${opt.isCorrect ? 'bg-[#34c759]/10 text-[#1a7a34] font-medium' : 'text-[#6e6e73]'}`}>
                              <span className={`w-3 h-3 rounded-full flex-shrink-0 ${opt.isCorrect ? 'bg-[#34c759]' : 'bg-[#d2d2d7]'}`}></span>
                              {opt.content}
                              {opt.isCorrect && <span className="ml-auto text-[10px] font-semibold text-[#34c759]">✓ Correct</span>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="micro-ui text-[#86868b]">No questions yet. Add one above.</p>
              )}
            </>
          )}
        </div>
      </Modal>

      {/* Question Form Modal */}
      <Modal isOpen={showQuestionFormModal} onClose={() => { setShowQuestionFormModal(false); setEditingQuestion(null); setQuestionForm({ content: '', type: 'SINGLE_CHOICE', orderIndex: 1, score: 1, options: [{ content: '', isCorrect: false }, { content: '', isCorrect: false }] }); }} title={editingQuestion ? 'Edit Question' : '+ Add Question'} size="md">
        <div className="space-y-4">
          <div><label className="control-label block mb-2 text-[#6e6e73]">Question Content *</label><textarea rows={3} value={questionForm.content} onChange={(e) => setQuestionForm({ ...questionForm, content: e.target.value })} placeholder="Write the question content here..." /></div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="control-label block mb-2 text-[#6e6e73]">Type</label>
              <select value={questionForm.type} onChange={(e) => {
                const newType = e.target.value;
                let newOptions = [...(questionForm.options || [])];
                if (newType === 'TRUE_FALSE') {
                  newOptions = [{ content: 'True', isCorrect: true }, { content: 'False', isCorrect: false }];
                } else if (questionForm.type === 'TRUE_FALSE') {
                  newOptions = [{ content: '', isCorrect: false }, { content: '', isCorrect: false }];
                } else if (newType === 'SINGLE_CHOICE') {
                  const hasCorrect = newOptions.findIndex(o => o.isCorrect);
                  newOptions = newOptions.map((o, i) => ({ ...o, isCorrect: i === hasCorrect }));
                }
                setQuestionForm({ ...questionForm, type: newType, options: newOptions });
              }}>
                <option value="SINGLE_CHOICE">Single Choice</option><option value="MULTIPLE_CHOICE">Multiple Choice</option><option value="TRUE_FALSE">True / False</option>
              </select>
            </div>
            <div><label className="control-label block mb-2 text-[#6e6e73]">Score</label><input type="number" min="0" value={questionForm.score} onChange={(e) => setQuestionForm({ ...questionForm, score: e.target.value })} /></div>
            <div><label className="control-label block mb-2 text-[#6e6e73]">Order</label><input type="number" min="1" value={questionForm.orderIndex} onChange={(e) => setQuestionForm({ ...questionForm, orderIndex: e.target.value })} /></div>
          </div>
          {/* Options Section */}
          <div className="pt-3 border-t border-[#f5f5f7]">
            <div className="flex justify-between items-center mb-2">
              <label className="control-label text-[#6e6e73]">Answers / Options *</label>
              {questionForm.type !== 'TRUE_FALSE' && (
                <button onClick={() => setQuestionForm({ ...questionForm, options: [...(questionForm.options || []), { content: '', isCorrect: false }] })} className="text-[#0071e3] text-[11px] font-semibold hover:bg-[#0071e3]/10 px-2 py-1 rounded">
                  <Plus size={12} className="inline mr-1" />Add Option
                </button>
              )}
            </div>
            <div className="space-y-2">
              {(questionForm.options || []).map((opt, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type={questionForm.type === 'MULTIPLE_CHOICE' ? 'checkbox' : 'radio'}
                    name="correctOption"
                    checked={opt.isCorrect}
                    onChange={() => {
                      const newOptions = [...questionForm.options];
                      if (questionForm.type === 'MULTIPLE_CHOICE') {
                        newOptions[index] = { ...newOptions[index], isCorrect: !newOptions[index].isCorrect };
                      } else {
                        newOptions.forEach((o, i) => newOptions[i] = { ...o, isCorrect: i === index });
                      }
                      setQuestionForm({ ...questionForm, options: newOptions });
                    }}
                    className="w-4 h-4 accent-[#0071e3]"
                  />
                  <input
                    type="text"
                    value={opt.content}
                    disabled={questionForm.type === 'TRUE_FALSE'}
                    onChange={(e) => {
                      const newOptions = [...questionForm.options];
                      newOptions[index] = { ...newOptions[index], content: e.target.value };
                      setQuestionForm({ ...questionForm, options: newOptions });
                    }}
                    className={`flex-1 text-sm py-1.5 ${opt.isCorrect ? 'border-[#0071e3] bg-[#0071e3]/5' : ''}`}
                    placeholder={`Option ${index + 1}`}
                  />
                  {questionForm.type !== 'TRUE_FALSE' && questionForm.options.length > 2 && (
                    <button onClick={() => {
                      const newOptions = questionForm.options.filter((_, i) => i !== index);
                      setQuestionForm({ ...questionForm, options: newOptions });
                    }} className="text-[#ff3b30] p-1.5 hover:bg-[#ff3b30]/10 rounded">
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-3 border-t border-[#f5f5f7]">
            <button onClick={() => { setShowQuestionFormModal(false); setEditingQuestion(null); setQuestionForm({ content: '', type: 'SINGLE_CHOICE', orderIndex: 1, score: 1, options: [{ content: '', isCorrect: false }, { content: '', isCorrect: false }] }); }} className="btn-secondary !text-[#1d1d1f]">Cancel</button>
            {editingQuestion ? (
              <button onClick={handleUpdateQuestion} disabled={questionSaving} className="btn-primary disabled:opacity-50">
                {questionSaving ? 'Saving...' : 'Save Changes'}
              </button>
            ) : (
              <button onClick={handleAddQuestion} disabled={questionSaving} className="btn-primary disabled:opacity-50"><Plus size={14} className="inline-block mr-1" /> {questionSaving ? 'Adding...' : 'Add Question'}</button>
            )}
          </div>
        </div>
      </Modal>

      {/* Student Detail Modal */}
      <Modal isOpen={showStudentDetail} onClose={() => setShowStudentDetail(false)} title="Student Details" size="md">
        {selectedStudent && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div><p className="control-label text-[#6e6e73] mb-1">Full Name</p><p className="body-emphasis text-[#1d1d1f]">{selectedStudent.fullName}</p></div>
              <div><p className="control-label text-[#6e6e73] mb-1">Email</p><p className="body-emphasis text-[#1d1d1f]">{selectedStudent.email}</p></div>
            </div>
            <div className="border-t border-[#f5f5f7] pt-4 grid grid-cols-2 gap-4">
              <div><p className="control-label text-[#6e6e73] mb-1">Status</p><StatusBadge status={selectedStudent.enrollmentStatus} size="xs" /></div>
              <div><p className="control-label text-[#6e6e73] mb-1">Enrollment</p><p className="body-emphasis text-[#1d1d1f]">{selectedStudent.enrollmentStatus}</p></div>
            </div>
            <div className="border-t border-[#f5f5f7] pt-4 grid grid-cols-3 gap-4">
              <div><p className="control-label text-[#6e6e73] mb-1">Submitted</p><p className="text-2xl font-bold text-[#0071e3]">{selectedStudent.submittedAssignments}</p></div>
              <div><p className="control-label text-[#6e6e73] mb-1">Total</p><p className="text-2xl font-bold text-[#1d1d1f]">{selectedStudent.totalAssignments}</p></div>
              <div><p className="control-label text-[#6e6e73] mb-1">Average Score</p><p className={`text-2xl font-bold ${getScoreColor(selectedStudent.averageScore)}`}>{formatScore(selectedStudent.averageScore)}</p></div>
            </div>
            <div className="border-t border-[#f5f5f7] pt-4">
              <p className="control-label text-[#6e6e73] mb-2">Completion Rate</p>
              <div className="w-full h-2 bg-[#d2d2d7] rounded-full overflow-hidden">
                <div className="h-full bg-[#0071e3] rounded-full transition-all" style={{ width: selectedStudent.totalAssignments > 0 ? `${(selectedStudent.submittedAssignments / selectedStudent.totalAssignments) * 100}%` : '0%' }} />
              </div>
              <p className="micro-ui text-[#86868b] mt-1">{selectedStudent.totalAssignments > 0 ? `${Math.round((selectedStudent.submittedAssignments / selectedStudent.totalAssignments) * 100)}% complete` : 'No assignments'}</p>
            </div>
          </div>
        )}
      </Modal>

      {/* Assignment Delete Confirm */}
      <ConfirmDialog
        isOpen={showAssignmentDeleteConfirm}
        onClose={() => setShowAssignmentDeleteConfirm(false)}
        onConfirm={handleDeleteAssignment}
        title="Delete Assignment"
        message="This will permanently delete the assignment and all its questions. Are you sure?"
        confirmText={saving ? "Deleting..." : "Delete"}
        isDanger={true}
      />

      {/* Course Delete Confirm */}
      <ConfirmDialog
        isOpen={showDeleteCourseConfirm}
        onClose={() => setShowDeleteCourseConfirm(false)}
        onConfirm={handleDeleteCourse}
        title="Delete Course"
        message={`Are you sure you want to permanently delete "${course?.title}"? This action cannot be undone and will delete all chapters, lessons, assignments, and student enrollments associated with this course.`}
        confirmText={saving ? "Deleting..." : "Delete"}
        isDanger={true}
      />
    </div>
  );
}
