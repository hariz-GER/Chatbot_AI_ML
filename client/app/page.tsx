"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Input, Button, Avatar, Typography, Tooltip, Drawer, Switch, message as antMessage } from 'antd';
import {
  SendOutlined,
  UserOutlined,
  ThunderboltOutlined,
  LoadingOutlined,
  CopyOutlined,
  CheckOutlined,
  LikeOutlined,
  DislikeOutlined,
  LikeFilled,
  DislikeFilled,
  AudioOutlined,
  DownloadOutlined,
  DeleteOutlined,
  MenuOutlined,
  BulbOutlined,
  SunOutlined,
  MoonOutlined,
  ReloadOutlined,
  HistoryOutlined,
  FileTextOutlined,
  EditOutlined,
  SaveOutlined,
  PlusOutlined
} from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import axios from 'axios';

const { Text } = Typography;
const { TextArea } = Input;

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  reaction?: 'like' | 'dislike' | null;
}

// Starter prompt templates
const PROMPT_TEMPLATES = [
  { icon: '💡', text: 'Explain a concept', prompt: 'Explain quantum computing in simple terms' },
  { icon: '📝', text: 'Write content', prompt: 'Write a professional email about...' },
  { icon: '💻', text: 'Help with code', prompt: 'Help me write a function that...' },
  { icon: '🎯', text: 'Solve a problem', prompt: 'How can I improve my productivity?' },
  { icon: '📊', text: 'Analyze data', prompt: 'What are the key trends in...' },
  { icon: '🎨', text: 'Creative ideas', prompt: 'Give me creative ideas for...' },
];

// Quick reply suggestions
const QUICK_REPLIES = [
  'Explain more',
  'Give an example',
  'Summarize this',
  'Make it simpler',
];

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [notesOpen, setNotesOpen] = useState(false);
  const [notes, setNotes] = useState<{ id: string, title: string, content: string, createdAt: Date }[]>([]);
  const [currentNote, setCurrentNote] = useState('');
  const [currentNoteTitle, setCurrentNoteTitle] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputValue(prev => prev + transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const toggleVoiceInput = () => {
    if (!recognitionRef.current) {
      antMessage.warning('Voice input is not supported in this browser');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const handleSend = async (text?: string) => {
    const messageText = text || inputValue;
    if (!messageText.trim() || loading) return;

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: messageText,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setLoading(true);

    // Create placeholder for AI response
    const aiMessageId = generateId();
    const aiMessage: Message = {
      id: aiMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, aiMessage]);

    try {
      // Use streaming endpoint
      const response = await fetch('http://localhost:4000/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText,
          previousMessages: messages.map(m => ({ role: m.role, content: m.content }))
        })
      });

      if (!response.ok) throw new Error('Stream failed');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        let fullText = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.text) {
                  fullText += data.text;
                  // Update the AI message content progressively
                  setMessages(prev => prev.map(msg =>
                    msg.id === aiMessageId
                      ? { ...msg, content: fullText }
                      : msg
                  ));
                }
                if (data.done) break;
              } catch (e) { }
            }
          }
        }
      }
    } catch (error: any) {
      // Update the placeholder message with error
      setMessages(prev => prev.map(msg =>
        msg.id === aiMessageId
          ? { ...msg, content: '⚠️ Connection error. Please try again.' }
          : msg
      ));
    } finally {
      setLoading(false);
    }
  };

  const handleReaction = (messageId: string, reaction: 'like' | 'dislike') => {
    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId) {
        return { ...msg, reaction: msg.reaction === reaction ? null : reaction };
      }
      return msg;
    }));
  };

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    antMessage.success('Copied to clipboard!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const exportConversation = () => {
    if (messages.length === 0) {
      antMessage.warning('No messages to export');
      return;
    }

    const content = messages.map(m =>
      `[${m.timestamp.toLocaleString()}] ${m.role.toUpperCase()}:\n${m.content}\n`
    ).join('\n---\n\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-export-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    antMessage.success('Conversation exported!');
  };

  const clearChat = () => {
    setMessages([]);
    antMessage.success('Chat cleared!');
  };

  // Notes Functions
  const saveNote = () => {
    if (!currentNote.trim()) {
      antMessage.warning('Please write something in the note');
      return;
    }

    if (editingNoteId) {
      // Update existing note
      setNotes(prev => prev.map(n =>
        n.id === editingNoteId
          ? { ...n, title: currentNoteTitle || 'Untitled Note', content: currentNote }
          : n
      ));
      antMessage.success('Note updated!');
      setEditingNoteId(null);
    } else {
      // Create new note
      const newNote = {
        id: generateId(),
        title: currentNoteTitle || `Note ${notes.length + 1}`,
        content: currentNote,
        createdAt: new Date()
      };
      setNotes(prev => [...prev, newNote]);
      antMessage.success('Note saved!');
    }

    setCurrentNote('');
    setCurrentNoteTitle('');
  };

  const deleteNote = (noteId: string) => {
    setNotes(prev => prev.filter(n => n.id !== noteId));
    antMessage.success('Note deleted!');
  };

  const copyNote = async (content: string) => {
    await navigator.clipboard.writeText(content);
    antMessage.success('Note copied to clipboard!');
  };

  const downloadNote = (note: { title: string, content: string, createdAt: Date }) => {
    const content = `Title: ${note.title}\nDate: ${note.createdAt.toLocaleString()}\n\n${note.content}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${note.title.replace(/[^a-z0-9]/gi, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    antMessage.success('Note downloaded!');
  };

  const downloadAllNotes = () => {
    if (notes.length === 0) {
      antMessage.warning('No notes to download');
      return;
    }

    const content = notes.map(n =>
      `=== ${n.title} ===\nDate: ${n.createdAt.toLocaleString()}\n\n${n.content}\n`
    ).join('\n' + '─'.repeat(50) + '\n\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `all-notes-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    antMessage.success('All notes downloaded!');
  };

  const editNote = (note: { id: string, title: string, content: string }) => {
    setEditingNoteId(note.id);
    setCurrentNoteTitle(note.title);
    setCurrentNote(note.content);
  };

  const addToNotes = (content: string) => {
    setCurrentNote(prev => prev ? prev + '\n\n' + content : content);
    setNotesOpen(true);
    antMessage.success('Added to notes!');
  };

  const regenerateLastResponse = async () => {
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
    if (lastUserMessage) {
      // Remove last AI response
      setMessages(prev => {
        const newMessages = [...prev];
        if (newMessages[newMessages.length - 1]?.role === 'assistant') {
          newMessages.pop();
        }
        return newMessages;
      });

      setLoading(true);
      try {
        const response = await axios.post('http://localhost:4000/api/chat', {
          message: lastUserMessage.content,
          previousMessages: messages.slice(0, -2).map(m => ({ role: m.role, content: m.content }))
        });

        const aiMessage: Message = {
          id: generateId(),
          role: 'assistant',
          content: response.data.reply,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, aiMessage]);
      } catch (error) {
        antMessage.error('Failed to regenerate response');
      } finally {
        setLoading(false);
      }
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  // Custom code block renderer with copy button
  const CodeBlock = ({ language, value }: { language: string; value: string }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    return (
      <div className="code-block-container">
        <div className="code-block-header">
          <span>{language || 'code'}</span>
          <button onClick={handleCopy} className="copy-btn">
            {copied ? <CheckOutlined /> : <CopyOutlined />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <SyntaxHighlighter
          language={language}
          style={oneDark}
          customStyle={{ margin: 0, borderRadius: '0 0 8px 8px' }}
        >
          {value}
        </SyntaxHighlighter>
      </div>
    );
  };

  const theme = {
    bg: darkMode ? '#0a0a14' : '#f5f5f7',
    headerBg: darkMode ? 'rgba(10, 10, 30, 0.9)' : 'rgba(255, 255, 255, 0.95)',
    bubbleUser: darkMode ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'linear-gradient(135deg, #3b82f6, #6366f1)',
    bubbleAi: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
    text: darkMode ? '#fff' : '#1a1a1a',
    textMuted: darkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
    border: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    inputBg: darkMode ? 'rgba(20, 20, 40, 0.9)' : 'rgba(255,255,255,0.9)',
  };

  return (
    <div className={`chat-container ${darkMode ? 'dark' : 'light'}`} style={{ background: theme.bg }}>
      {/* Background */}
      <div className="professional-bg">
        <div className="grid-pattern" style={{
          backgroundImage: `linear-gradient(${darkMode ? 'rgba(99, 102, 241, 0.03)' : 'rgba(99, 102, 241, 0.08)'} 1px, transparent 1px), linear-gradient(90deg, ${darkMode ? 'rgba(99, 102, 241, 0.03)' : 'rgba(99, 102, 241, 0.08)'} 1px, transparent 1px)`
        }}></div>
      </div>

      {/* Sidebar Drawer */}
      <Drawer
        title="Chat Options"
        placement="left"
        onClose={() => setSidebarOpen(false)}
        open={sidebarOpen}
        styles={{ body: { background: theme.bg }, header: { background: theme.headerBg, color: theme.text } }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: theme.bubbleAi, borderRadius: '12px' }}>
            <span style={{ color: theme.text }}>{darkMode ? <MoonOutlined /> : <SunOutlined />} Theme</span>
            <Switch checked={darkMode} onChange={setDarkMode} />
          </div>

          <Button icon={<FileTextOutlined />} onClick={() => { setNotesOpen(true); setSidebarOpen(false); }} block>
            📝 My Notes ({notes.length})
          </Button>

          <Button icon={<DownloadOutlined />} onClick={exportConversation} block>
            Export Chat
          </Button>

          <Button icon={<DeleteOutlined />} onClick={clearChat} danger block>
            Clear Chat
          </Button>

          <div style={{ marginTop: '20px' }}>
            <Text style={{ color: theme.textMuted }}>Chat Statistics</Text>
            <div style={{ marginTop: '10px', color: theme.text }}>
              <p>Messages: {messages.length}</p>
              <p>User messages: {messages.filter(m => m.role === 'user').length}</p>
              <p>AI responses: {messages.filter(m => m.role === 'assistant').length}</p>
              <p>Notes: {notes.length}</p>
            </div>
          </div>
        </div>
      </Drawer>

      {/* Notes Drawer */}
      <Drawer
        title={<span><FileTextOutlined /> My Notes</span>}
        placement="right"
        onClose={() => { setNotesOpen(false); setEditingNoteId(null); setCurrentNote(''); setCurrentNoteTitle(''); }}
        open={notesOpen}
        width={400}
        styles={{ body: { background: theme.bg, padding: '16px' }, header: { background: theme.headerBg, color: theme.text } }}
        extra={
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            onClick={downloadAllNotes}
            disabled={notes.length === 0}
            size="small"
          >
            Download All
          </Button>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%' }}>
          {/* Note Editor */}
          <div style={{ background: theme.bubbleAi, borderRadius: '12px', padding: '16px', border: `1px solid ${theme.border}` }}>
            <Input
              placeholder="Note title..."
              value={currentNoteTitle}
              onChange={e => setCurrentNoteTitle(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: `1px solid ${theme.border}`,
                borderRadius: 0,
                color: theme.text,
                marginBottom: '12px',
                fontSize: '16px',
                fontWeight: 600
              }}
            />
            <TextArea
              placeholder="Write your note here... You can paste anything!"
              value={currentNote}
              onChange={e => setCurrentNote(e.target.value)}
              autoSize={{ minRows: 4, maxRows: 8 }}
              style={{
                background: 'transparent',
                border: 'none',
                color: theme.text,
                resize: 'none'
              }}
            />
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                onClick={saveNote}
                block
              >
                {editingNoteId ? 'Update Note' : 'Save Note'}
              </Button>
              {editingNoteId && (
                <Button
                  onClick={() => { setEditingNoteId(null); setCurrentNote(''); setCurrentNoteTitle(''); }}
                >
                  Cancel
                </Button>
              )}
            </div>
          </div>

          {/* Notes List */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <Text style={{ color: theme.textMuted, fontSize: '12px', marginBottom: '12px', display: 'block' }}>
              Saved Notes ({notes.length})
            </Text>

            {notes.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: theme.textMuted }}>
                <FileTextOutlined style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }} />
                <p>No notes yet</p>
                <p style={{ fontSize: '12px' }}>Save AI responses or write your own notes</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {notes.map(note => (
                  <div
                    key={note.id}
                    style={{
                      background: theme.bubbleAi,
                      borderRadius: '12px',
                      padding: '14px',
                      border: `1px solid ${theme.border}`
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <div>
                        <Text strong style={{ color: theme.text, fontSize: '14px' }}>{note.title}</Text>
                        <Text style={{ color: theme.textMuted, fontSize: '11px', display: 'block' }}>
                          {note.createdAt.toLocaleDateString()}
                        </Text>
                      </div>
                    </div>
                    <Text style={{ color: theme.text, fontSize: '13px', display: 'block', marginBottom: '12px' }}>
                      {note.content.length > 150 ? note.content.substring(0, 150) + '...' : note.content}
                    </Text>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <Tooltip title="Edit">
                        <Button size="small" icon={<EditOutlined />} onClick={() => editNote(note)} />
                      </Tooltip>
                      <Tooltip title="Copy">
                        <Button size="small" icon={<CopyOutlined />} onClick={() => copyNote(note.content)} />
                      </Tooltip>
                      <Tooltip title="Download">
                        <Button size="small" icon={<DownloadOutlined />} onClick={() => downloadNote(note)} />
                      </Tooltip>
                      <Tooltip title="Delete">
                        <Button size="small" icon={<DeleteOutlined />} onClick={() => deleteNote(note.id)} danger />
                      </Tooltip>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Drawer>

      {/* Header */}
      <header className="chat-header" style={{ background: theme.headerBg, borderColor: theme.border }}>
        <div className="header-content">
          <Button
            type="text"
            icon={<MenuOutlined style={{ color: theme.text }} />}
            onClick={() => setSidebarOpen(true)}
          />

          <div className="logo-container">
            <div className="logo">
              <ThunderboltOutlined className="logo-icon" />
            </div>
          </div>

          <div className="header-text">
            <h1 style={{ color: theme.text }}>Smart Assistant</h1>
            <div className="status-line" style={{ color: theme.textMuted }}>
              <span className="status-dot"></span>
              <span>Powered by Hariz • Online</span>
            </div>
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
            <Tooltip title="My Notes">
              <Button
                type="text"
                icon={<FileTextOutlined style={{ color: theme.text }} />}
                onClick={() => setNotesOpen(true)}
              />
            </Tooltip>
            <Tooltip title="Toggle Theme">
              <Button
                type="text"
                icon={darkMode ? <SunOutlined style={{ color: theme.text }} /> : <MoonOutlined style={{ color: theme.text }} />}
                onClick={() => setDarkMode(!darkMode)}
              />
            </Tooltip>
            <Tooltip title="Export Chat">
              <Button
                type="text"
                icon={<DownloadOutlined style={{ color: theme.text }} />}
                onClick={exportConversation}
              />
            </Tooltip>
          </div>
        </div>
      </header>

      {/* Messages Area */}
      <main className="messages-area">
        <div className="messages-wrapper">
          {/* Starter Templates (show when no messages) */}
          {messages.length === 0 && (
            <div className="starter-section">
              <div className="starter-greeting">
                <ThunderboltOutlined style={{ fontSize: '48px', color: '#6366f1' }} />
                <h2 style={{ color: theme.text, marginTop: '16px' }}>How can I help you today?</h2>
                <p style={{ color: theme.textMuted }}>Choose a template or type your own message</p>
              </div>

              <div className="prompt-templates">
                {PROMPT_TEMPLATES.map((template, i) => (
                  <button
                    key={i}
                    className="template-card"
                    onClick={() => setInputValue(template.prompt)}
                    style={{ background: theme.bubbleAi, borderColor: theme.border, color: theme.text }}
                  >
                    <span className="template-icon">{template.icon}</span>
                    <span className="template-text">{template.text}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.map((item) => (
            <div key={item.id} className={`message-row ${item.role}`}>
              <div className="message-bubble-container">
                {item.role === 'assistant' && (
                  <div className="avatar-container assistant">
                    <ThunderboltOutlined />
                  </div>
                )}

                <div className="message-content">
                  <div
                    className={`message-bubble ${item.role}`}
                    style={{
                      background: item.role === 'user' ? theme.bubbleUser : theme.bubbleAi,
                      border: item.role === 'assistant' ? `1px solid ${theme.border}` : 'none'
                    }}
                  >
                    {item.role === 'user' ? (
                      <p style={{ color: '#fff' }}>{item.content}</p>
                    ) : (
                      <div className="markdown-content" style={{ color: theme.text }}>
                        <ReactMarkdown
                          components={{
                            code({ node, inline, className, children, ...props }: any) {
                              const match = /language-(\w+)/.exec(className || '');
                              return !inline && match ? (
                                <CodeBlock language={match[1]} value={String(children).replace(/\n$/, '')} />
                              ) : (
                                <code className="inline-code" {...props}>{children}</code>
                              );
                            }
                          }}
                        >
                          {item.content}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>

                  {/* Message Actions */}
                  <div className="message-actions" style={{ color: theme.textMuted }}>
                    <span className="message-time">{formatTime(item.timestamp)}</span>

                    {item.role === 'assistant' && (
                      <>
                        <Tooltip title="Copy">
                          <button
                            className="action-btn"
                            onClick={() => copyToClipboard(item.content, item.id)}
                          >
                            {copiedId === item.id ? <CheckOutlined /> : <CopyOutlined />}
                          </button>
                        </Tooltip>
                        <Tooltip title="Save to Notes">
                          <button
                            className="action-btn"
                            onClick={() => addToNotes(item.content)}
                          >
                            <FileTextOutlined />
                          </button>
                        </Tooltip>
                        <Tooltip title="Good response">
                          <button
                            className={`action-btn ${item.reaction === 'like' ? 'active' : ''}`}
                            onClick={() => handleReaction(item.id, 'like')}
                          >
                            {item.reaction === 'like' ? <LikeFilled style={{ color: '#22c55e' }} /> : <LikeOutlined />}
                          </button>
                        </Tooltip>
                        <Tooltip title="Bad response">
                          <button
                            className={`action-btn ${item.reaction === 'dislike' ? 'active' : ''}`}
                            onClick={() => handleReaction(item.id, 'dislike')}
                          >
                            {item.reaction === 'dislike' ? <DislikeFilled style={{ color: '#ef4444' }} /> : <DislikeOutlined />}
                          </button>
                        </Tooltip>
                      </>
                    )}
                  </div>
                </div>

                {item.role === 'user' && (
                  <div className="avatar-container user">
                    <UserOutlined />
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          {loading && (
            <div className="message-row assistant">
              <div className="message-bubble-container">
                <div className="avatar-container assistant">
                  <ThunderboltOutlined />
                </div>
                <div className="message-bubble assistant typing" style={{ background: theme.bubbleAi }}>
                  <div className="typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Quick Replies */}
          {messages.length > 0 && !loading && messages[messages.length - 1]?.role === 'assistant' && (
            <div className="quick-replies">
              {QUICK_REPLIES.map((reply, i) => (
                <button
                  key={i}
                  className="quick-reply-btn"
                  onClick={() => handleSend(reply)}
                  style={{ background: theme.bubbleAi, borderColor: theme.border, color: theme.text }}
                >
                  {reply}
                </button>
              ))}
              <button
                className="quick-reply-btn regenerate"
                onClick={regenerateLastResponse}
                style={{ background: 'transparent', borderColor: theme.border, color: theme.textMuted }}
              >
                <ReloadOutlined /> Regenerate
              </button>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input Area */}
      <footer className="input-area" style={{ background: theme.headerBg, borderColor: theme.border }}>
        <div className="input-container">
          <div className="input-wrapper" style={{ background: theme.inputBg, borderColor: theme.border }}>
            <TextArea
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onPressEnter={(e) => {
                if (!e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Type your message..."
              autoSize={{ minRows: 1, maxRows: 4 }}
              disabled={loading}
              className="chat-input"
              style={{ color: theme.text }}
            />

            <Tooltip title={isListening ? "Stop listening" : "Voice input"}>
              <button
                className={`voice-btn ${isListening ? 'listening' : ''}`}
                onClick={toggleVoiceInput}
              >
                <AudioOutlined />
              </button>
            </Tooltip>

            <button
              className={`send-button ${inputValue.trim() && !loading ? 'active' : ''}`}
              onClick={() => handleSend()}
              disabled={loading || !inputValue.trim()}
            >
              {loading ? <LoadingOutlined spin /> : <SendOutlined />}
            </button>
          </div>
          <p className="input-hint" style={{ color: theme.textMuted }}>
            Press Enter to send • Shift + Enter for new line • 🎤 Click mic for voice input
          </p>
        </div>
      </footer>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', sans-serif; overflow: hidden; }

        .chat-container {
          height: 100vh;
          display: flex;
          flex-direction: column;
          position: relative;
          overflow: hidden;
        }

        .professional-bg {
          position: fixed;
          inset: 0;
          z-index: 0;
        }

        .grid-pattern {
          position: absolute;
          inset: 0;
          background-size: 40px 40px;
        }

        .chat-header {
          position: relative;
          z-index: 10;
          padding: 12px 16px;
          backdrop-filter: blur(20px);
          border-bottom: 1px solid;
        }

        .header-content {
          display: flex;
          align-items: center;
          gap: 12px;
          max-width: 1000px;
          margin: 0 auto;
        }

        .logo {
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .logo-icon { font-size: 20px; color: #fff; }

        .header-text h1 {
          font-size: 18px;
          font-weight: 600;
          margin: 0;
        }

        .status-line {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          margin-top: 2px;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          background: #22c55e;
          border-radius: 50%;
          box-shadow: 0 0 8px #22c55e;
        }

        .messages-area {
          flex: 1;
          overflow-y: auto;
          position: relative;
          z-index: 10;
        }

        .messages-wrapper {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        /* Starter Section */
        .starter-section {
          text-align: center;
          padding: 60px 20px;
        }

        .starter-greeting {
          margin-bottom: 40px;
        }

        .starter-greeting h2 {
          font-size: 28px;
          font-weight: 600;
        }

        .prompt-templates {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 12px;
          max-width: 600px;
          margin: 0 auto;
        }

        .template-card {
          padding: 16px;
          border-radius: 12px;
          border: 1px solid;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }

        .template-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 20px rgba(99, 102, 241, 0.2);
        }

        .template-icon { font-size: 24px; }
        .template-text { font-size: 13px; font-weight: 500; }

        /* Messages */
        .message-row {
          display: flex;
          animation: slideIn 0.3s ease-out;
        }

        .message-row.user { justify-content: flex-end; }
        .message-row.assistant { justify-content: flex-start; }

        @keyframes slideIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .message-bubble-container {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          max-width: 80%;
        }

        .message-content {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .avatar-container {
          width: 32px;
          height: 32px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          color: #fff;
          flex-shrink: 0;
        }

        .avatar-container.assistant {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
        }

        .avatar-container.user {
          background: linear-gradient(135deg, #ec4899, #f43f5e);
        }

        .message-bubble {
          padding: 12px 16px;
          border-radius: 16px;
          max-width: 100%;
        }

        .message-bubble.assistant {
          border-top-left-radius: 4px;
          backdrop-filter: blur(10px);
        }

        .message-bubble.user {
          border-top-right-radius: 4px;
        }

        .message-bubble p {
          margin: 0;
          font-size: 14px;
          line-height: 1.6;
        }

        .message-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 11px;
          padding: 0 4px;
        }

        .action-btn {
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px;
          opacity: 0.6;
          transition: opacity 0.2s;
          color: inherit;
        }

        .action-btn:hover { opacity: 1; }

        /* Typing Indicator */
        .message-bubble.typing { padding: 16px 20px; }

        .typing-dots {
          display: flex;
          gap: 4px;
        }

        .typing-dots span {
          width: 8px;
          height: 8px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          border-radius: 50%;
          animation: bounce 1.4s ease-in-out infinite;
        }

        .typing-dots span:nth-child(1) { animation-delay: 0s; }
        .typing-dots span:nth-child(2) { animation-delay: 0.2s; }
        .typing-dots span:nth-child(3) { animation-delay: 0.4s; }

        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-8px); }
        }

        /* Quick Replies */
        .quick-replies {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          padding-left: 42px;
        }

        .quick-reply-btn {
          padding: 8px 14px;
          border-radius: 20px;
          border: 1px solid;
          cursor: pointer;
          font-size: 13px;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .quick-reply-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }

        /* Code Block */
        .code-block-container {
          border-radius: 8px;
          overflow: hidden;
          margin: 8px 0;
        }

        .code-block-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          background: #2d2d2d;
          font-size: 12px;
          color: #999;
        }

        .copy-btn {
          background: none;
          border: none;
          color: #999;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
        }

        .copy-btn:hover { color: #fff; }

        .inline-code {
          background: rgba(99, 102, 241, 0.2);
          padding: 2px 6px;
          border-radius: 4px;
          font-family: 'Monaco', monospace;
          font-size: 13px;
        }

        /* Input Area */
        .input-area {
          position: relative;
          z-index: 10;
          padding: 16px 20px;
          backdrop-filter: blur(20px);
          border-top: 1px solid;
        }

        .input-container {
          max-width: 800px;
          margin: 0 auto;
        }

        .input-wrapper {
          display: flex;
          align-items: flex-end;
          gap: 8px;
          border-radius: 16px;
          border: 1px solid;
          padding: 8px 8px 8px 16px;
        }

        .chat-input {
          flex: 1;
          background: transparent !important;
          border: none !important;
          font-size: 14px !important;
          resize: none !important;
          padding: 8px 0 !important;
        }

        .chat-input:focus { box-shadow: none !important; }
        .chat-input::placeholder { opacity: 0.5; }

        .voice-btn {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          border: none;
          background: rgba(99, 102, 241, 0.1);
          color: #6366f1;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .voice-btn:hover { background: rgba(99, 102, 241, 0.2); }
        .voice-btn.listening {
          background: #ef4444;
          color: #fff;
          animation: pulse 1s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }

        .send-button {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          border: none;
          background: rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.4);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          font-size: 16px;
        }

        .send-button.active {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: #fff;
          box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4);
        }

        .send-button:disabled { cursor: not-allowed; }

        .input-hint {
          text-align: center;
          font-size: 11px;
          margin-top: 8px;
        }

        /* Markdown */
        .markdown-content p { margin: 0 0 8px 0; }
        .markdown-content p:last-child { margin: 0; }
        .markdown-content strong { font-weight: 600; }
        .markdown-content ul, .markdown-content ol { margin: 8px 0; padding-left: 20px; }
        .markdown-content li { margin: 4px 0; }
        .markdown-content a { color: #6366f1; text-decoration: underline; }

        /* Scrollbar */
        .messages-area::-webkit-scrollbar { width: 6px; }
        .messages-area::-webkit-scrollbar-track { background: transparent; }
        .messages-area::-webkit-scrollbar-thumb { background: rgba(99, 102, 241, 0.3); border-radius: 3px; }

        /* Drawer Override */
        .ant-drawer-content { background: #0a0a14 !important; }
        .ant-drawer-header { background: #0a0a14 !important; border-color: rgba(255,255,255,0.1) !important; }
        .ant-drawer-title { color: #fff !important; }
        .ant-drawer-close { color: #fff !important; }
      `}</style>
    </div>
  );
}
