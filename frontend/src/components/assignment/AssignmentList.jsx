import AssignmentCard from './AssignmentCard';
import EmptyState from '../ui/EmptyState';
import { ClipboardList } from 'lucide-react';

export default function AssignmentList({ assignments, courseId, onQuestions, onSubmissions, onEdit, onDelete }) {
  if (assignments.length === 0) {
    return <EmptyState icon={ClipboardList} title="No assignments" description="Create your first assignment for this course" />;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {assignments.map((assignment, index) => (
        <AssignmentCard
          key={assignment.id}
          assignment={assignment}
          index={index}
          onQuestions={() => onQuestions(assignment)}
          onSubmissions={() => onSubmissions(courseId, assignment)}
          onEdit={() => onEdit(assignment)}
          onDelete={() => onDelete(assignment)}
        />
      ))}
    </div>
  );
}
