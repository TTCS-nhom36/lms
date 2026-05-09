import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, X, Trash2, Send, Sparkles, BookOpen } from 'lucide-react';
import { chatApi } from '../../api/chatApi';
import { useAuth } from '../../contexts/AuthContext';
import './ChatWidget.css';

/* ─── Simple markdown parser ─── */
function renderMarkdown(text) {
  if (!text) return '';

  let html = text
    // Code blocks (``` ... ```)
    .replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
      return `<pre><code class="${lang}">${code.replace(/</g, '&lt;').replace(/>/g, '&gt;').trim()}</code></pre>`;
    })
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Headers
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Unordered lists
    .replace(/^[*-] (.+)$/gm, '<li>$1</li>')
    // Ordered lists
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

  // Wrap consecutive <li> in <ul>
  html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>');

  // Paragraphs — wrap remaining lines
  html = html
    .split('\n\n')
    .map(block => {
      const trimmed = block.trim();
      if (!trimmed) return '';
      if (
        trimmed.startsWith('<h') ||
        trimmed.startsWith('<ul') ||
        trimmed.startsWith('<ol') ||
        trimmed.startsWith('<pre') ||
        trimmed.startsWith('<li')
      ) {
        return trimmed.replace(/\n/g, '<br/>');
      }
      return `<p>${trimmed.replace(/\n/g, '<br/>')}</p>`;
    })
    .join('');

  return html;
}

/* ─── Suggestion chips ─── */
const SUGGESTIONS = [
  'Tóm tắt nội dung khóa học của tôi',
  'Bài tập nào sắp đến hạn?',
  'Cho tôi mẹo học tập hiệu quả',
  'Giải thích khái niệm này cho tôi...',
];

export default function ChatWidget() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  // Load history when opened
  useEffect(() => {
    if (isOpen && !historyLoaded) {
      loadHistory();
    }
  }, [isOpen, historyLoaded]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 350);
    }
  }, [isOpen]);

  const loadHistory = async () => {
    try {
      const res = await chatApi.getHistory();
      setMessages(res.data || []);
      setHistoryLoaded(true);
    } catch (err) {
      console.error('Failed to load chat history:', err);
      setHistoryLoaded(true);
    }
  };

  const handleToggle = () => {
    if (isOpen) {
      setIsClosing(true);
      setTimeout(() => {
        setIsOpen(false);
        setIsClosing(false);
      }, 250);
    } else {
      setIsOpen(true);
    }
  };

  const handleSend = async (text) => {
    const msg = (text || input).trim();
    if (!msg || isLoading) return;

    // Add user message optimistically
    const userMsg = {
      id: Date.now(),
      role: 'USER',
      content: msg,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await chatApi.sendMessage(msg);
      setMessages(prev => [...prev, res.data]);
    } catch (err) {
      console.error('Failed to send message:', err);
      setMessages(prev => [
        ...prev,
        {
          id: Date.now() + 1,
          role: 'ASSISTANT',
          content: 'Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại sau.',
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = async () => {
    try {
      await chatApi.clearHistory();
      setMessages([]);
    } catch (err) {
      console.error('Failed to clear history:', err);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
    // Auto-resize textarea
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 100) + 'px';
  };

  const userInitials = user?.fullName
    ?.split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?';

  return (
    <>
      {/* Chat Panel */}
      {isOpen && (
        <div className={`chat-panel${isClosing ? ' closing' : ''}`} id="chat-panel">
          {/* Header */}
          <div className="chat-panel__header">
            <div className="chat-panel__header-avatar">
              <Sparkles size={18} />
            </div>
            <div className="chat-panel__header-info">
              <div className="chat-panel__header-title">Chatbot36</div>
            </div>
            <div className="chat-panel__header-actions">
              <button
                className="chat-panel__header-btn"
                onClick={handleClearHistory}
                title="Xóa lịch sử"
                id="chat-clear-btn"
              >
                <Trash2 size={16} />
              </button>
              <button
                className="chat-panel__header-btn"
                onClick={handleToggle}
                title="Đóng"
                id="chat-close-btn"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="chat-panel__messages" id="chat-messages">
            {messages.length === 0 && !isLoading ? (
              <div className="chat-welcome">
                <div className="chat-welcome__icon">
                  <BookOpen size={26} />
                </div>
                <div className="chat-welcome__title">Xin chào, {user?.fullName?.split(' ').pop() || 'bạn'}! 👋</div>
                <div className="chat-welcome__desc">
                  Mình là trợ lý học tập AI. Hỏi mình bất cứ điều gì về khóa học, bài tập, hay mẹo học tập nhé!
                </div>
                <div className="chat-welcome__suggestions">
                  {SUGGESTIONS.map((s, i) => (
                    <button
                      key={i}
                      className="chat-welcome__suggestion"
                      onClick={() => handleSend(s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`chat-msg chat-msg--${msg.role.toLowerCase()}`}
                  >
                    <div className="chat-msg__avatar">
                      {msg.role === 'ASSISTANT' ? (
                        <Sparkles size={14} />
                      ) : (
                        userInitials
                      )}
                    </div>
                    <div className="chat-msg__bubble">
                      {msg.role === 'ASSISTANT' ? (
                        <div dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
                      ) : (
                        msg.content
                      )}
                    </div>
                  </div>
                ))}

                {/* Typing indicator */}
                {isLoading && (
                  <div className="chat-typing">
                    <div className="chat-typing__avatar">
                      <Sparkles size={14} />
                    </div>
                    <div className="chat-typing__dots">
                      <span className="chat-typing__dot" />
                      <span className="chat-typing__dot" />
                      <span className="chat-typing__dot" />
                    </div>
                  </div>
                )}
              </>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="chat-panel__input-area">
            <div className="chat-panel__input-wrap">
              <textarea
                ref={inputRef}
                className="chat-panel__input"
                placeholder="Hỏi bất cứ điều gì..."
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                rows={1}
                id="chat-input"
              />
            </div>
            <button
              className="chat-panel__send-btn"
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              title="Gửi"
              id="chat-send-btn"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Floating Bubble */}
      <button
        className={`chat-bubble${isOpen ? ' open' : ''}`}
        onClick={handleToggle}
        title="Chat với trợ lý AI"
        id="chat-bubble-btn"
      >
        <span className="chat-bubble__icon">
          {isOpen ? <X size={26} /> : <MessageCircle size={26} />}
        </span>
      </button>
    </>
  );
}
