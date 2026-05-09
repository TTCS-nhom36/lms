import { useState, useEffect, useRef, useCallback } from 'react';
import { Upload, FileText, Trash2, RefreshCw, Clock, File, CheckCircle2, XCircle, Loader2, HardDrive } from 'lucide-react';
import { chatApi } from '../../api/chatApi';
import { useToast } from '../../contexts/ToastContext';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

function formatFileSize(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function Documents() {
  const toast = useToast();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [reindexing, setReindexing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      const res = await chatApi.listDocuments();
      setDocuments(res.data || []);
    } catch (err) {
      toast.error('Không thể tải danh sách tài liệu');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (file) => {
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast.error('Chỉ hỗ trợ file PDF');
      return;
    }

    if (file.size > 52 * 1024 * 1024) {
      toast.error('File quá lớn (tối đa 50MB)');
      return;
    }

    setUploading(true);
    try {
      const res = await chatApi.uploadPdf(file);
      toast.success(`Đã index "${res.data.fileName}" thành công (${res.data.chunkCount} đoạn)`);
      setDocuments(prev => [res.data, ...prev]);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload thất bại');
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e) => {
    handleUpload(e.target.files?.[0]);
    e.target.value = '';
  };

  const handleReindex = async () => {
    setReindexing(true);
    try {
      await chatApi.reindex();
      toast.success('Re-index dữ liệu LMS thành công');
    } catch (err) {
      toast.error('Re-index thất bại');
    } finally {
      setReindexing(false);
    }
  };

  // Drag & drop handlers
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  }, []);

  if (loading) return <LoadingSpinner text="Đang tải..." />;

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">

        <button
          className="btn-secondary"
          onClick={handleReindex}
          disabled={reindexing}
        >
          <RefreshCw size={15} className={reindexing ? 'animate-spin' : ''} />
          {reindexing ? 'Đang re-index...' : 'Re-index LMS Data'}
        </button>
      </div>

      {/* Upload Zone */}
      <div
        className={`card border-2 border-dashed transition-all duration-200 cursor-pointer ${dragOver
          ? 'border-blue-400 bg-blue-50/50'
          : uploading
            ? 'border-gray-300 bg-gray-50'
            : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50/30'
          }`}
        onClick={() => !uploading && fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{ borderRadius: 18 }}
      >
        <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
          {uploading ? (
            <>
              <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
                <Loader2 size={24} className="text-blue-600 animate-spin" />
              </div>
              <p className="text-sm font-semibold text-gray-700">Đang xử lý tài liệu...</p>
              <p className="text-xs text-gray-400 mt-1">Trích xuất văn bản, chia nhỏ và embedding vào vector database</p>
            </>
          ) : (
            <>
              <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
                <Upload size={24} className="text-blue-600" />
              </div>
              <p className="text-sm font-semibold text-gray-700">
                {dragOver ? 'Thả file vào đây' : 'Kéo thả file PDF hoặc nhấn để chọn'}
              </p>
              <p className="text-xs text-gray-400 mt-1">Hỗ trợ file PDF, tối đa 50MB</p>
            </>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleFileChange}
          className="hidden"
          id="doc-file-input"
        />
      </div>



      {/* Documents Table */}
      <div className="apple-table-card">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Tài liệu đã upload</h2>
        </div>

        {documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
              <FileText size={24} className="text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-500">Chưa có tài liệu nào</p>
            <p className="text-xs text-gray-400 mt-1">Upload file PDF đầu tiên để bắt đầu</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Tên file</th>
                <th>Kích thước</th>
                <th>Trang</th>
                <th>Chunks</th>
                <th>Người upload</th>
                <th>Thời gian</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc, index) => (
                <tr
                  key={doc.id}
                  className="animate-slide-up"
                  style={{ opacity: 0, animationDelay: `${index * 0.03}s` }}
                >
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                        <FileText size={14} className="text-red-500" />
                      </div>
                      <span className="font-medium text-sm truncate max-w-[240px]" title={doc.fileName}>
                        {doc.fileName}
                      </span>
                    </div>
                  </td>
                  <td className="text-sm text-gray-500">{formatFileSize(doc.fileSize)}</td>
                  <td className="text-sm text-gray-500">{doc.pageCount ?? '—'}</td>
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
    </div>
  );
}
