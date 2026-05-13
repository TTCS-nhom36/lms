import { Edit, Trash2 } from 'lucide-react';
import StatusBadge from '../ui/StatusBadge';

export default function UsersTable({ users, onEdit, onDeactivate }) {
  return (
    <div className="apple-table-card">
      <div className="overflow-x-auto">
        <table className="min-w-[800px] table-fixed">
          <thead>
            <tr>
              <th className="!pl-8 w-[38%]">User profile</th>
              <th className="w-[18%]">Roles & Identity</th>
              <th className="w-[16%]">System Status</th>
              <th className="w-[16%]">Date Added</th>
              <th className="text-right !pr-8 w-[12%]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="align-middle">
                <td className="!pl-8 align-middle">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-[#f5f5f7] border border-[#d2d2d7] flex items-center justify-center text-[#1d1d1f] font-semibold">
                      {user.fullName?.charAt(0)}
                    </div>
                    <div>
                      <div className="body-emphasis text-[#1d1d1f] mb-0.5">{user.fullName}</div>
                      <div className="control-label text-[#86868b]">{user.email}</div>
                    </div>
                  </div>
                </td>
                <td className="align-middle"><StatusBadge status={user.role} size="sm" /></td>
                <td className="align-middle"><StatusBadge status={user.isActive} size="sm" /></td>
                <td className="control-label text-[#6e6e73] align-middle whitespace-nowrap">
                  {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}
                </td>
                <td className="!pr-8 align-middle">
                  <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                    <button onClick={() => onEdit(user)} className="w-8 h-8 rounded-full flex items-center justify-center text-[#86868b] hover:bg-[#f5f5f7] hover:text-[#0071e3] transition-colors" title="Edit">
                      <Edit size={16} />
                    </button>
                    <button onClick={() => onDeactivate(user.id)} className="w-8 h-8 rounded-full flex items-center justify-center text-[#86868b] hover:bg-[#fef2f2] hover:text-[#e30000] transition-colors" title="Deactivate">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
