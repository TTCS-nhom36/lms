import { useState, useEffect, useRef, useCallback } from 'react';
import { Upload, RefreshCw, Loader2 } from 'lucide-react';
import { chatApi } from '../../api/chatApi';
import { useToast } from '../../hooks/useToast';
import { getApiErrorMessage } from '../../utils/apiError';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import PageHeader from '../../components/ui/PageHeader';
import DocumentsTable from '../../components/documents/DocumentsTable';

export default function Documents() {
  const toast = useToast();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [reindexing, setReindexing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const loadDocuments = useCallback(async () => {
    try {
      const res = await chatApi.listDocuments();
      setDocuments(res.data || []);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not load documents'));
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const handleUpload = useCallback(async (file) => {
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast.error('Only PDF files are supported');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      toast.error('File is too large. Maximum size is 50 MB');
      return;
    }

    setUploading(true);
    try {
      const res = await chatApi.uploadPdf(file);
      toast.success(`Indexed "${res.data.fileName}" successfully (${res.data.chunkCount} chunks)`);
      setDocuments((prev) => [res.data, ...prev]);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Upload failed'));
    } finally {
      setUploading(false);
    }
  }, [toast]);

  const handleFileChange = (event) => {
    handleUpload(event.target.files?.[0]);
    event.target.value = '';
  };

  const handleReindex = async () => {
    setReindexing(true);
    try {
      await chatApi.reindex();
      toast.success('LMS data re-indexed successfully');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Re-index failed'));
    } finally {
      setReindexing(false);
    }
  };

  const handleDragOver = useCallback((event) => {
    event.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((event) => {
    event.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((event) => {
    event.preventDefault();
    setDragOver(false);
    handleUpload(event.dataTransfer.files?.[0]);
  }, [handleUpload]);

  if (loading) return <LoadingSpinner text="Loading documents..." />;

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      <PageHeader
        title="Documents"
        description={`${documents.length} indexed files`}
        actions={
          <button
            className="btn-secondary"
            onClick={handleReindex}
            disabled={reindexing}
          >
            <RefreshCw size={15} className={reindexing ? 'animate-spin' : ''} />
            {reindexing ? 'Re-indexing...' : 'Re-index LMS Data'}
          </button>
        }
      />

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
              <p className="text-sm font-semibold text-gray-700">Processing document...</p>
              <p className="text-xs text-gray-400 mt-1">Extracting text, splitting content, and storing embeddings</p>
            </>
          ) : (
            <>
              <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
                <Upload size={24} className="text-blue-600" />
              </div>
              <p className="text-sm font-semibold text-gray-700">
                {dragOver ? 'Drop the file here' : 'Drag a PDF here or click to choose'}
              </p>
              <p className="text-xs text-gray-400 mt-1">PDF only, up to 50 MB</p>
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

      <DocumentsTable documents={documents} />
    </div>
  );
}
