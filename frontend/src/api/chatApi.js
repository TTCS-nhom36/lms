import api from './axios';

export const chatApi = {
  sendMessage: (message) => api.post('/chat', { message }),
  getHistory: () => api.get('/chat/history'),
  clearHistory: () => api.delete('/chat/history'),
  uploadPdf: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/rag/upload-pdf', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  listDocuments: () => api.get('/rag/documents'),
  reindex: () => api.post('/rag/reindex'),
};
