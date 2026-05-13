import { CheckCircle2, Clock, FileText } from 'lucide-react';

function formatFileSize(bytes) {
  if (!bytes) return '-';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('en-US', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function DocumentsTable({ documents }) {
  return (
    <div className="apple-table-card">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">Uploaded documents</h2>
      </div>

      {documents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
            <FileText size={24} className="text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-500">No documents yet</p>
          <p className="text-xs text-gray-400 mt-1">Upload your first PDF to get started</p>
        </div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>File name</th>
              <th>Size</th>
              <th>Pages</th>
              <th>Chunks</th>
              <th>Uploaded by</th>
              <th>Uploaded at</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((doc, index) => (
              <tr key={doc.id} className="animate-slide-up" style={{ opacity: 0, animationDelay: `${index * 0.03}s` }}>
                <td>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                      <FileText size={14} className="text-red-500" />
                    </div>
                    <span className="font-medium text-sm truncate max-w-[240px]" title={doc.fileName}>{doc.fileName}</span>
                  </div>
                </td>
                <td className="text-sm text-gray-500">{formatFileSize(doc.fileSize)}</td>
                <td className="text-sm text-gray-500">{doc.pageCount ?? '-'}</td>
                <td>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                    <CheckCircle2 size={11} />
                    {doc.chunkCount}
                  </span>
                </td>
                <td className="text-sm text-gray-500">{doc.uploadedBy}</td>
                <td className="text-sm text-gray-400">
                  <div className="flex items-center gap-1.5">
                    <Clock size={12} />
                    {formatDate(doc.createdAt)}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
