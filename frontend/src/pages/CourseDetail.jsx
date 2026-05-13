import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { assignmentApi } from '../api/assignmentApi';
import { chapterApi } from '../api/chapterApi';
import { courseApi } from '../api/courseApi';
import { lessonApi } from '../api/lessonApi';
import AssignmentFormModal from '../components/assignment/AssignmentFormModal';
import CourseAssignmentList from '../components/course/CourseAssignmentList';
import CourseCurriculum from '../components/course/CourseCurriculum';
import CourseHero from '../components/course/CourseHero';
import ChapterFormModal from '../components/course/ChapterFormModal';
import LessonFormModal from '../components/course/LessonFormModal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { getApiErrorMessage } from '../utils/apiError';
import { firstError, validateAssignmentForm } from '../utils/validation';
import { Plus } from 'lucide-react';

const emptyAssignmentForm = {
  title: '',
  description: '',
  type: 'QUIZ',
  dueDate: '',
  allowLate: false,
  maxScore: 100,
  weight: 1,
  timeLimitMins: 0,
  shuffleQuestions: false,
  shuffleOptions: false,
};

export default function CourseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isStudent, isInstructor, isAdmin } = useAuth();
  const toast = useToast();
  const [course, setCourse] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [lessons, setLessons] = useState({});
  const [assignments, setAssignments] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [loading, setLoading] = useState(true);
  const [showChapterModal, setShowChapterModal] = useState(false);
  const [editChapter, setEditChapter] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [chapterForm, setChapterForm] = useState({ title: '' });
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [editLesson, setEditLesson] = useState(null);
  const [lessonForm, setLessonForm] = useState({ title: '', contentType: 'VIDEO', contentUrl: '', contentText: '', isFreePreview: false, chapterId: null, orderIndex: 1 });
  const [showLessonConfirm, setShowLessonConfirm] = useState(false);
  const [deleteLessonId, setDeleteLessonId] = useState(null);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [editAssignment, setEditAssignment] = useState(null);
  const [assignmentForm, setAssignmentForm] = useState(emptyAssignmentForm);
  const [showAssignmentConfirm, setShowAssignmentConfirm] = useState(false);
  const [deleteAssignmentId, setDeleteAssignmentId] = useState(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await courseApi.getById(id);
      setCourse(res.data.course);
      setChapters(res.data.chapters || []);

      const lessonData = {};
      for (const chapter of res.data.chapters || []) {
        try {
          const lessonRes = await lessonApi.getByChapter(chapter.id);
          lessonData[chapter.id] = lessonRes.data || [];
        } catch {
          lessonData[chapter.id] = [];
        }
      }
      setLessons(lessonData);

      try {
        const assignmentRes = await assignmentApi.getByCourse(id);
        setAssignments(assignmentRes.data || []);
      } catch {
        setAssignments([]);
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to load course'));
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => { loadData(); }, [loadData]);

  const toggleChapter = (chapterId) => {
    setExpanded((prev) => ({ ...prev, [chapterId]: !prev[chapterId] }));
  };

  const handleCreateChapter = () => {
    setEditChapter(null);
    setChapterForm({ title: '', orderIndex: chapters.length + 1 });
    setShowChapterModal(true);
  };

  const handleEditChapter = (chapter) => {
    setEditChapter(chapter);
    setChapterForm({ title: chapter.title, orderIndex: chapter.orderIndex || 1 });
    setShowChapterModal(true);
  };

  const handleSaveChapter = async () => {
    try {
      const payload = { title: chapterForm.title, orderIndex: chapterForm.orderIndex };
      if (editChapter) {
        await chapterApi.update(editChapter.id, payload);
        toast.success('Chapter updated');
      } else {
        await chapterApi.create(id, payload);
        toast.success('Chapter created');
      }
      setShowChapterModal(false);
      loadData();
    } catch {
      toast.error('Failed to save chapter');
    }
  };

  const handleDeleteChapter = async () => {
    try {
      await chapterApi.delete(deleteId);
      toast.success('Chapter deleted');
      setShowConfirm(false);
      loadData();
    } catch {
      toast.error('Failed to delete chapter');
    }
  };

  const handleMoveChapter = async (chapterId, direction) => {
    const sortedChapters = [...chapters].sort((a, b) => a.orderIndex - b.orderIndex);
    const index = sortedChapters.findIndex((chapter) => chapter.id === chapterId);
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === sortedChapters.length - 1)) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    [sortedChapters[index], sortedChapters[newIndex]] = [sortedChapters[newIndex], sortedChapters[index]];

    try {
      await chapterApi.reorder({ chapterIds: sortedChapters.map((chapter) => chapter.id) });
      loadData();
    } catch {
      toast.error('Failed to reorder chapters');
    }
  };

  const handleCreateLesson = (chapterId) => {
    setEditLesson(null);
    setLessonForm({
      title: '',
      contentType: 'VIDEO',
      contentUrl: '',
      contentText: '',
      isFreePreview: false,
      chapterId,
      orderIndex: (lessons[chapterId]?.length || 0) + 1,
    });
    setShowLessonModal(true);
  };

  const handleEditLesson = (lesson) => {
    setEditLesson(lesson);
    setLessonForm({
      title: lesson.title,
      contentType: lesson.contentType || 'VIDEO',
      contentUrl: lesson.contentUrl || '',
      contentText: lesson.contentText || '',
      isFreePreview: lesson.isFreePreview || false,
      chapterId: lesson.chapterId,
      orderIndex: lesson.orderIndex ?? 1,
    });
    setShowLessonModal(true);
  };

  const handleSaveLesson = async () => {
    try {
      const payload = {
        chapterId: lessonForm.chapterId,
        title: lessonForm.title,
        contentType: lessonForm.contentType,
        contentUrl: lessonForm.contentUrl,
        contentText: lessonForm.contentText,
        isFreePreview: lessonForm.isFreePreview,
        orderIndex: lessonForm.orderIndex,
      };

      if (editLesson) {
        await lessonApi.update(editLesson.id, payload);
        toast.success('Lesson updated');
      } else {
        await lessonApi.create(lessonForm.chapterId, payload);
        toast.success('Lesson created');
      }
      setShowLessonModal(false);
      loadData();
    } catch {
      toast.error('Failed to save lesson');
    }
  };

  const handleDeleteLesson = async () => {
    try {
      await lessonApi.delete(deleteLessonId);
      toast.success('Lesson deleted');
      setShowLessonConfirm(false);
      loadData();
    } catch {
      toast.error('Failed to delete lesson');
    }
  };

  const handleCreateAssignment = () => {
    setEditAssignment(null);
    setAssignmentForm(emptyAssignmentForm);
    setShowAssignmentModal(true);
  };

  const handleEditAssignment = (assignment) => {
    setEditAssignment(assignment);
    setAssignmentForm({
      title: assignment.title || '',
      description: assignment.description || '',
      type: assignment.type || 'QUIZ',
      dueDate: assignment.dueDate ? assignment.dueDate.substring(0, 16) : '',
      allowLate: assignment.allowLate || false,
      maxScore: assignment.maxScore || 100,
      weight: assignment.weight || 1,
      timeLimitMins: assignment.timeLimitMins || 0,
      shuffleQuestions: assignment.shuffleQuestions || false,
      shuffleOptions: assignment.shuffleOptions || false,
    });
    setShowAssignmentModal(true);
  };

  const handleSaveAssignment = async () => {
    const errors = validateAssignmentForm(assignmentForm);
    if (Object.keys(errors).length) {
      toast.error(firstError(errors));
      return;
    }
    try {
      const payload = {
        ...assignmentForm,
        courseId: Number(id),
        dueDate: assignmentForm.dueDate ? `${assignmentForm.dueDate}:00` : null,
      };
      if (editAssignment) {
        await assignmentApi.update(editAssignment.id, payload);
        toast.success('Assignment updated');
      } else {
        await assignmentApi.create(id, payload);
        toast.success('Assignment created');
      }
      setShowAssignmentModal(false);
      loadData();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to save assignment'));
    }
  };

  const handleDeleteAssignment = async () => {
    try {
      await assignmentApi.delete(deleteAssignmentId);
      toast.success('Assignment deleted');
      setShowAssignmentConfirm(false);
      loadData();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to delete assignment'));
    }
  };

  if (loading) return <LoadingSpinner text="Loading course..." />;
  if (!course) return null;

  const canManage = isAdmin || isInstructor;
  const totalLessons = Object.values(lessons).flat().length;
  const baseManagePath = isAdmin ? '/admin' : '/instructor';

  return (
    <div className="mx-auto max-w-7xl space-y-6 animate-fade-in">
      <CourseHero
        course={course}
        chaptersCount={chapters.length}
        lessonsCount={totalLessons}
        assignmentsCount={assignments.length}
        actions={canManage && (
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" onClick={() => navigate(`${baseManagePath}/courses/${course.id}/edit`)} className="!border-white/40 !bg-white/15 !px-4 !py-2 text-sm !text-white hover:!bg-white/25 md:hidden">
              Edit Settings
            </Button>
            <Button variant="secondary" onClick={() => navigate(`${baseManagePath}/courses/${course.id}/enroll`)} className="!border-white/40 !bg-white/15 !px-4 !py-2 text-sm !text-white hover:!bg-white/25 md:hidden">
              Enroll Students
            </Button>
            <Button onClick={handleCreateAssignment} className="!px-4 !py-2 text-sm shadow-lg shadow-primary-950/20">
              <Plus size={14} /> Add Assignment
            </Button>
          </div>
        )}
      />

      <main className="space-y-6">
        <CourseCurriculum
          chapters={chapters}
          lessons={lessons}
          expanded={expanded}
          canManage={canManage}
          isStudent={isStudent}
          onCreateChapter={handleCreateChapter}
          onToggleChapter={toggleChapter}
          onMoveChapter={handleMoveChapter}
          onEditChapter={handleEditChapter}
          onDeleteChapter={(chapter) => { setDeleteId(chapter.id); setShowConfirm(true); }}
          onCreateLesson={handleCreateLesson}
          onOpenLesson={(lesson) => {
            const rolePath = isAdmin ? '/admin' : isInstructor ? '/instructor' : '/student';
            navigate(`${rolePath}/courses/${id}/lessons/${lesson.id}`);
          }}
          onEditLesson={handleEditLesson}
          onDeleteLesson={(lesson) => { setDeleteLessonId(lesson.id); setShowLessonConfirm(true); }}
        />

        <CourseAssignmentList
          assignments={assignments}
          onOpen={(assignment) => {
            if (isStudent) navigate(`/student/assignments/${assignment.id}`);
            else if (isInstructor || isAdmin) navigate(`${isAdmin ? '/admin' : '/instructor'}/courses/${id}/assignments/${assignment.id}`);
          }}
          canManage={canManage}
          onEdit={handleEditAssignment}
          onDelete={(assignment) => { setDeleteAssignmentId(assignment.id); setShowAssignmentConfirm(true); }}
        />
      </main>

      {canManage && (
        <>
          <ChapterFormModal
            isOpen={showChapterModal}
            onClose={() => setShowChapterModal(false)}
            onSave={handleSaveChapter}
            chapter={editChapter}
            form={chapterForm}
            onChange={setChapterForm}
          />
          <LessonFormModal
            isOpen={showLessonModal}
            onClose={() => setShowLessonModal(false)}
            onSave={handleSaveLesson}
            lesson={editLesson}
            form={lessonForm}
            onChange={setLessonForm}
          />
        </>
      )}

      <AssignmentFormModal
        isOpen={showAssignmentModal}
        onClose={() => setShowAssignmentModal(false)}
        onSave={handleSaveAssignment}
        assignment={editAssignment}
        form={assignmentForm}
        onChange={setAssignmentForm}
      />
      <ConfirmDialog
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleDeleteChapter}
        title="Delete Chapter"
        message="This will permanently delete the chapter and all its lessons. Are you sure?"
      />
      <ConfirmDialog
        isOpen={showAssignmentConfirm}
        onClose={() => setShowAssignmentConfirm(false)}
        onConfirm={handleDeleteAssignment}
        title="Delete Assignment"
        message="This will permanently delete the assignment. Are you sure?"
      />
      <ConfirmDialog
        isOpen={showLessonConfirm}
        onClose={() => setShowLessonConfirm(false)}
        onConfirm={handleDeleteLesson}
        title="Delete Lesson"
        message="This will permanently delete the lesson. Are you sure?"
      />
    </div>
  );
}
