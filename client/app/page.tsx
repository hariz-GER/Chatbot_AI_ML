"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Input, Button, Avatar, Typography } from 'antd';
import { SendOutlined, UserOutlined, ThunderboltOutlined, LoadingOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import axios from 'axios';

const { Text } = Typography;
const { TextArea } = Input;

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hey there! 👋 I\'m your **Smart Assistant** powered by AI. Ask me anything!', timestamp: new Date() }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async () => {
    if (!inputValue.trim() || loading) return;

    const userMessage: Message = { role: 'user', content: inputValue, timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setLoading(true);

    try {
      const response = await axios.post('http://localhost:4000/api/chat', {
        message: inputValue,
        previousMessages: messages.map(m => ({ role: m.role, content: m.content }))
      });

      const aiMessage: Message = { role: 'assistant', content: response.data.reply, timestamp: new Date() };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error: any) {
      const errorMessage: Message = {
        role: 'assistant',
        content: '⚠️ Oops! Something went wrong. Make sure the server is running.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (date?: Date) => {
    if (!date) return '';
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="chat-container">
      {/* Animated Background */}
      <div className="animated-bg">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
        <div className="gradient-orb orb-3"></div>
      </div>

      {/* Floating Particles */}
      <div className="particles">
        {[...Array(20)].map((_, i) => (
          <div key={i} className="particle" style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 5}s`,
            animationDuration: `${15 + Math.random() * 10}s`
          }}></div>
        ))}
      </div>

      {/* Header */}
      <header className="chat-header">
        <div className="header-content">
          <div className="logo-container">
            <div className="logo-glow"></div>
            <div className="logo">
              <ThunderboltOutlined className="logo-icon" />
            </div>
          </div>
          <div className="header-text">
            <h1>Smart Assistant</h1>
            <div className="status-line">
              <span className="status-dot"></span>
              <span>Powered by Hariz • Online</span>
            </div>
          </div>
        </div>
        <div className="header-decoration"></div>
      </header>

      {/* Messages Area */}
      <main className="messages-area">
        <div className="messages-wrapper">
          {messages.map((item, index) => (
            <div
              key={index}
              className={`message-row ${item.role}`}
            >
              <div className="message-bubble-container">
                {item.role === 'assistant' && (
                  <div className="avatar-container assistant">
                    <ThunderboltOutlined />
                  </div>
                )}
                <div className={`message-bubble ${item.role}`}>
                  {item.role === 'user' ? (
                    <p>{item.content}</p>
                  ) : (
                    <div className="markdown-content">
                      <ReactMarkdown>{item.content}</ReactMarkdown>
                    </div>
                  )}
                  <span className="message-time">{formatTime(item.timestamp)}</span>
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
                <div className="message-bubble assistant typing">
                  <div className="typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input Area */}
      <footer className="input-area">
        <div className="input-container">
          <div className="input-glow"></div>
          <div className="input-wrapper">
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
            />
            <button
              className={`send-button ${inputValue.trim() && !loading ? 'active' : ''} ${loading ? 'loading' : ''}`}
              onClick={handleSend}
              disabled={loading || !inputValue.trim()}
            >
              {loading ? <LoadingOutlined spin /> : <SendOutlined />}
            </button>
          </div>
          <p className="input-hint">Press Enter to send • Shift + Enter for new line</p>
        </div>
      </footer>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap');

        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        body {
          font-family: 'Space Grotesk', sans-serif;
          background: #050510;
          color: #fff;
          overflow: hidden;
        }

        .chat-container {
          height: 100vh;
          display: flex;
          flex-direction: column;
          position: relative;
          overflow: hidden;
        }

        /* Animated Background */
        .animated-bg {
          position: fixed;
          inset: 0;
          z-index: 0;
          background: linear-gradient(180deg, #050510 0%, #0a0a20 50%, #050510 100%);
        }

        .gradient-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.5;
          animation: float 20s ease-in-out infinite;
        }

        .orb-1 {
          width: 500px;
          height: 500px;
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          top: -200px;
          left: -100px;
          animation-delay: 0s;
        }

        .orb-2 {
          width: 400px;
          height: 400px;
          background: linear-gradient(135deg, #ec4899 0%, #f43f5e 100%);
          bottom: -150px;
          right: -100px;
          animation-delay: -7s;
        }

        .orb-3 {
          width: 300px;
          height: 300px;
          background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%);
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          animation-delay: -14s;
        }

        @keyframes float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(50px, -50px) scale(1.1); }
          50% { transform: translate(-30px, 30px) scale(0.95); }
          75% { transform: translate(30px, 50px) scale(1.05); }
        }

        /* Particles */
        .particles {
          position: fixed;
          inset: 0;
          z-index: 1;
          pointer-events: none;
        }

        .particle {
          position: absolute;
          width: 4px;
          height: 4px;
          background: rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          animation: rise linear infinite;
        }

        @keyframes rise {
          0% { transform: translateY(100vh) scale(0); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(-100vh) scale(1); opacity: 0; }
        }

        /* Header */
        .chat-header {
          position: relative;
          z-index: 10;
          padding: 16px 24px;
          background: rgba(10, 10, 30, 0.8);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .header-content {
          display: flex;
          align-items: center;
          gap: 16px;
          max-width: 900px;
          margin: 0 auto;
        }

        .logo-container {
          position: relative;
        }

        .logo-glow {
          position: absolute;
          inset: -8px;
          background: linear-gradient(135deg, #6366f1, #ec4899);
          border-radius: 20px;
          filter: blur(15px);
          opacity: 0.6;
          animation: pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.1); }
        }

        .logo {
          position: relative;
          width: 48px;
          height: 48px;
          background: linear-gradient(135deg, #6366f1 0%, #ec4899 100%);
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .logo-icon {
          font-size: 24px;
          color: #fff;
        }

        .header-text h1 {
          font-size: 22px;
          font-weight: 700;
          background: linear-gradient(90deg, #fff 0%, #a5b4fc 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .status-line {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: rgba(255, 255, 255, 0.5);
          margin-top: 2px;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          background: #22c55e;
          border-radius: 50%;
          box-shadow: 0 0 10px #22c55e;
          animation: blink 2s ease-in-out infinite;
        }

        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        /* Messages Area */
        .messages-area {
          flex: 1;
          overflow-y: auto;
          position: relative;
          z-index: 10;
        }

        .messages-wrapper {
          max-width: 900px;
          margin: 0 auto;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .message-row {
          display: flex;
          animation: slideIn 0.3s ease-out;
        }

        .message-row.user {
          justify-content: flex-end;
        }

        .message-row.assistant {
          justify-content: flex-start;
        }

        @keyframes slideIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .message-bubble-container {
          display: flex;
          align-items: flex-end;
          gap: 12px;
          max-width: 75%;
        }

        .avatar-container {
          width: 36px;
          height: 36px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          flex-shrink: 0;
        }

        .avatar-container.assistant {
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4);
        }

        .avatar-container.user {
          background: linear-gradient(135deg, #ec4899 0%, #f43f5e 100%);
          box-shadow: 0 4px 15px rgba(236, 72, 153, 0.4);
        }

        .message-bubble {
          padding: 14px 18px;
          border-radius: 20px;
          position: relative;
        }

        .message-bubble.assistant {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-top-left-radius: 4px;
          backdrop-filter: blur(10px);
        }

        .message-bubble.user {
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          border-top-right-radius: 4px;
          box-shadow: 0 4px 20px rgba(99, 102, 241, 0.3);
        }

        .message-bubble p {
          margin: 0;
          font-size: 15px;
          line-height: 1.6;
        }

        .message-time {
          display: block;
          font-size: 11px;
          color: rgba(255, 255, 255, 0.4);
          margin-top: 6px;
          text-align: right;
        }

        /* Typing Indicator */
        .message-bubble.typing {
          padding: 18px 24px;
        }

        .typing-dots {
          display: flex;
          gap: 6px;
        }

        .typing-dots span {
          width: 8px;
          height: 8px;
          background: linear-gradient(135deg, #6366f1, #ec4899);
          border-radius: 50%;
          animation: bounce 1.4s ease-in-out infinite;
        }

        .typing-dots span:nth-child(1) { animation-delay: 0s; }
        .typing-dots span:nth-child(2) { animation-delay: 0.2s; }
        .typing-dots span:nth-child(3) { animation-delay: 0.4s; }

        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-10px); }
        }

        /* Input Area */
        .input-area {
          position: relative;
          z-index: 10;
          padding: 20px 24px;
          background: rgba(10, 10, 30, 0.8);
          backdrop-filter: blur(20px);
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }

        .input-container {
          max-width: 900px;
          margin: 0 auto;
          position: relative;
        }

        .input-glow {
          position: absolute;
          inset: -2px;
          background: linear-gradient(90deg, #6366f1, #ec4899, #6366f1);
          background-size: 200% 100%;
          border-radius: 20px;
          opacity: 0.5;
          filter: blur(10px);
          animation: shimmer 3s linear infinite;
        }

        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        .input-wrapper {
          position: relative;
          display: flex;
          align-items: flex-end;
          gap: 12px;
          background: rgba(20, 20, 40, 0.9);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 18px;
          padding: 8px 8px 8px 18px;
        }

        .chat-input {
          flex: 1;
          background: transparent !important;
          border: none !important;
          color: #fff !important;
          font-size: 15px !important;
          font-family: 'Space Grotesk', sans-serif !important;
          resize: none !important;
          padding: 8px 0 !important;
        }

        .chat-input::placeholder {
          color: rgba(255, 255, 255, 0.4) !important;
        }

        .chat-input:focus {
          box-shadow: none !important;
        }

        .send-button {
          width: 44px;
          height: 44px;
          border-radius: 14px;
          border: none;
          background: rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.4);
          font-size: 18px;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .send-button.active {
          background: linear-gradient(135deg, #6366f1 0%, #ec4899 100%);
          color: #fff;
          box-shadow: 0 4px 20px rgba(99, 102, 241, 0.4);
          transform: scale(1);
        }

        .send-button.active:hover {
          transform: scale(1.05);
          box-shadow: 0 6px 25px rgba(99, 102, 241, 0.5);
        }

        .send-button:disabled {
          cursor: not-allowed;
        }

        .input-hint {
          text-align: center;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.3);
          margin-top: 10px;
        }

        /* Scrollbar */
        .messages-area::-webkit-scrollbar {
          width: 6px;
        }

        .messages-area::-webkit-scrollbar-track {
          background: transparent;
        }

        .messages-area::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 3px;
        }

        /* Markdown Styles */
        .markdown-content p { margin: 0 0 8px 0; }
        .markdown-content p:last-child { margin: 0; }
        .markdown-content strong { font-weight: 600; color: #fff; }
        .markdown-content em { font-style: italic; }
        .markdown-content code {
          background: rgba(255, 255, 255, 0.15);
          padding: 2px 6px;
          border-radius: 4px;
          font-family: 'Monaco', monospace;
          font-size: 13px;
        }
        .markdown-content pre {
          background: rgba(0, 0, 0, 0.4);
          padding: 12px 16px;
          border-radius: 8px;
          overflow-x: auto;
          margin: 8px 0;
        }
        .markdown-content ul, .markdown-content ol { margin: 8px 0; padding-left: 20px; }
        .markdown-content li { margin: 4px 0; }
        .markdown-content a { color: #a5b4fc; text-decoration: underline; }
      `}</style>
    </div>
  );
}
