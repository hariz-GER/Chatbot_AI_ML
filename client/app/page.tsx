"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Layout, Input, Button, List, Avatar, Card, Typography, Space, message } from 'antd';
import { SendOutlined, UserOutlined, RobotOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Header, Content, Footer } = Layout;
const { Title, Text } = Typography;
const { TextArea } = Input;

// Type definition for chat messages
interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hello! I am your AI assistant. How can I help you today?' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = { role: 'user', content: inputValue };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setLoading(true);

    try {
      // Connect to actual backend
      const response = await axios.post('http://localhost:4000/api/chat', {
        message: inputValue,
        previousMessages: messages.map(m => ({ role: m.role, content: m.content }))
      });

      const aiMessage: Message = { role: 'assistant', content: response.data.reply };
      setMessages(prev => [...prev, aiMessage]);
      setLoading(false);

    } catch (error: any) {
      console.error('Chat Error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to send message';
      message.error(`Error: ${errorMessage}. Is server running on port 4000?`);
      setLoading(false);
    }
  };

  return (
    <Layout style={{ height: '100vh', background: '#f0f2f5' }}>
      <Header style={{ background: '#fff', padding: '0 20px', display: 'flex', alignItems: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', zIndex: 1 }}>
        <RobotOutlined style={{ fontSize: '24px', marginRight: '10px', color: '#1890ff' }} />
        <Title level={4} style={{ margin: 0 }}>AI Chatbot</Title>
      </Header>

      <Content style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column' }}>
        <Card
          style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
          styles={{ body: { flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column' } }}
        >
          <List
            itemLayout="horizontal"
            dataSource={messages}
            renderItem={(item) => (
              <List.Item style={{ border: 'none', padding: '10px 0', justifyContent: item.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  display: 'flex',
                  flexDirection: item.role === 'user' ? 'row-reverse' : 'row',
                  maxWidth: '80%',
                  alignItems: 'flex-start'
                }}>
                  <Avatar
                    icon={item.role === 'user' ? <UserOutlined /> : <RobotOutlined />}
                    style={{
                      backgroundColor: item.role === 'user' ? '#87d068' : '#1890ff',
                      margin: item.role === 'user' ? '0 0 0 10px' : '0 10px 0 0'
                    }}
                  />
                  <div style={{
                    background: item.role === 'user' ? '#e6f7ff' : '#f5f5f5',
                    padding: '10px 15px',
                    borderRadius: '10px',
                    borderTopRightRadius: item.role === 'user' ? '2px' : '10px',
                    borderTopLeftRadius: item.role === 'user' ? '10px' : '2px',
                  }}>
                    <Text>{item.content}</Text>
                  </div>
                </div>
              </List.Item>
            )}
          />
          <div ref={messagesEndRef} />
        </Card>
      </Content>

      <Footer style={{ background: '#fff', padding: '20px', boxShadow: '0 -2px 8px rgba(0,0,0,0.05)', zIndex: 1 }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex' }}>
          <TextArea
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onPressEnter={(e) => {
              if (!e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Type your message here..."
            autoSize={{ minRows: 1, maxRows: 4 }}
            style={{ borderRadius: '20px', padding: '10px 20px', resize: 'none' }}
          />
          <Button
            type="primary"
            shape="circle"
            icon={<SendOutlined />}
            size="large"
            onClick={handleSend}
            loading={loading}
            style={{ marginLeft: '10px', flexShrink: 0 }}
          />
        </div>
      </Footer>
    </Layout>
  );
}
