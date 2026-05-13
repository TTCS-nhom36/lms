import { Calendar, Clock, Edit, Eye, Plus, Trash2 } from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import StatusBadge from '../ui/StatusBadge';

export default function AssignmentCard({
  assignment,
  index = 0,
  onQuestions,
  onSubmissions,
  onEdit,
  onDelete,
}) {
  return (
    <Card className="p-4 animate-slide-up" style={{ opacity: 0, animationDelay: `${index * 0.05}s` }}>
      <div className="flex items-start justify-between mb-2.5">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-900 text-[13px] truncate">{assignment.title}</h4>
          <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{assignment.description || 'No description'}</p>
        </div>
        <StatusBadge status={assignment.type} size="xs" />
      </div>
      <div className="flex items-center gap-3 text-[11px] text-gray-400 mb-3">
        {assignment.dueDate && (
          <span className="flex items-center gap-1">
            <Calendar size={11} /> {new Date(assignment.dueDate).toLocaleString('vi-VN')}
          </span>
        )}
        {assignment.timeLimitMins > 0 && (
          <span className="flex items-center gap-1">
            <Clock size={11} /> {assignment.timeLimitMins} min
          </span>
        )}
        <span>Max: {assignment.maxScore}</span>
      </div>
      <div className="flex items-center gap-1 pt-2.5 border-t border-gray-100">
        <Button variant="ghost" size="sm" onClick={onQuestions} className="!px-3 !py-1.5 text-[11px] text-gray-500 hover:text-green-700 hover:bg-green-50" title="Add Question">
          <Plus size={12} className="inline-block mr-1" /> Questions
        </Button>
        <Button variant="ghost" size="sm" onClick={onSubmissions} className="!p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50" title="View Submissions">
          <Eye size={14} />
        </Button>
        <Button variant="ghost" size="sm" onClick={onEdit} className="!p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50" title="Edit">
          <Edit size={14} />
        </Button>
        <Button variant="ghost" size="sm" onClick={onDelete} className="!p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 ml-auto" title="Delete">
          <Trash2 size={14} />
        </Button>
      </div>
    </Card>
  );
}
