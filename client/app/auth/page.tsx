"use client";

import React, { useState, useEffect } from 'react';
import { Input, Button, message } from 'antd';
import {
    UserOutlined,
    LockOutlined,
    MailOutlined,
    ThunderboltOutlined,
    EyeOutlined,
    EyeInvisibleOutlined
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function AuthPage() {
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const router = useRouter();

    // Check if already logged in
    useEffect(() => {
        const token = localStorage.getItem('authToken');
        if (token) {
            // Verify token
            axios.get(`${API_URL}/api/auth/verify`, {
                headers: { Authorization: `Bearer ${token}` }
            }).then(() => {
                router.push('/');
            }).catch(() => {
                localStorage.removeItem('authToken');
                localStorage.removeItem('user');
            });
        }
    }, [router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email || !password || (!isLogin && !name)) {
            message.error('Please fill in all fields');
            return;
        }

        setLoading(true);

        try {
            const endpoint = isLogin ? '/api/auth/login' : '/api/auth/signup';
            const payload = isLogin
                ? { email, password }
                : { email, password, name };

            const response = await axios.post(`${API_URL}${endpoint}`, payload);

            // Save token and user data
            localStorage.setItem('authToken', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.user));

            message.success(isLogin ? 'Welcome back!' : 'Account created successfully!');
            router.push('/');

        } catch (error: any) {
            message.error(error.response?.data?.error || 'Authentication failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
        }}>
            <div style={{
                width: '100%',
                maxWidth: '420px',
                background: 'rgba(30, 30, 50, 0.9)',
                borderRadius: '24px',
                padding: '48px 40px',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
            }}>
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <div style={{
                        width: '64px',
                        height: '64px',
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        borderRadius: '16px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '16px',
                        boxShadow: '0 10px 30px rgba(99, 102, 241, 0.3)'
                    }}>
                        <ThunderboltOutlined style={{ fontSize: '32px', color: '#fff' }} />
                    </div>
                    <h1 style={{
                        color: '#fff',
                        fontSize: '28px',
                        fontWeight: 700,
                        margin: '0 0 8px 0'
                    }}>
                        Smart Assistant
                    </h1>
                    <p style={{ color: 'rgba(255,255,255,0.6)', margin: 0 }}>
                        {isLogin ? 'Welcome back! Sign in to continue.' : 'Create your account to get started.'}
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit}>
                    {!isLogin && (
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', display: 'block', marginBottom: '8px' }}>
                                Full Name
                            </label>
                            <Input
                                size="large"
                                prefix={<UserOutlined style={{ color: 'rgba(255,255,255,0.4)' }} />}
                                placeholder="Enter your name"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                style={{
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '12px',
                                    color: '#fff',
                                    height: '48px'
                                }}
                            />
                        </div>
                    )}

                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', display: 'block', marginBottom: '8px' }}>
                            Email Address
                        </label>
                        <Input
                            size="large"
                            type="email"
                            prefix={<MailOutlined style={{ color: 'rgba(255,255,255,0.4)' }} />}
                            placeholder="Enter your email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            style={{
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '12px',
                                color: '#fff',
                                height: '48px'
                            }}
                        />
                    </div>

                    <div style={{ marginBottom: '28px' }}>
                        <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', display: 'block', marginBottom: '8px' }}>
                            Password
                        </label>
                        <Input
                            size="large"
                            type={showPassword ? 'text' : 'password'}
                            prefix={<LockOutlined style={{ color: 'rgba(255,255,255,0.4)' }} />}
                            suffix={
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)' }}
                                >
                                    {showPassword ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                                </button>
                            }
                            placeholder={isLogin ? 'Enter your password' : 'Create a password (min 6 chars)'}
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            style={{
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '12px',
                                color: '#fff',
                                height: '48px'
                            }}
                        />
                    </div>

                    <Button
                        type="primary"
                        htmlType="submit"
                        loading={loading}
                        block
                        size="large"
                        style={{
                            height: '52px',
                            borderRadius: '12px',
                            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                            border: 'none',
                            fontSize: '16px',
                            fontWeight: 600,
                            boxShadow: '0 10px 30px rgba(99, 102, 241, 0.3)'
                        }}
                    >
                        {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account')}
                    </Button>
                </form>

                {/* Toggle */}
                <div style={{ textAlign: 'center', marginTop: '24px' }}>
                    <span style={{ color: 'rgba(255,255,255,0.5)' }}>
                        {isLogin ? "Don't have an account? " : "Already have an account? "}
                    </span>
                    <button
                        onClick={() => setIsLogin(!isLogin)}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#6366f1',
                            cursor: 'pointer',
                            fontWeight: 600,
                            fontSize: '14px'
                        }}
                    >
                        {isLogin ? 'Sign Up' : 'Sign In'}
                    </button>
                </div>

                {/* Continue as Guest */}
                <div style={{ textAlign: 'center', marginTop: '20px' }}>
                    <button
                        onClick={() => router.push('/')}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'rgba(255,255,255,0.4)',
                            cursor: 'pointer',
                            fontSize: '14px',
                            textDecoration: 'underline'
                        }}
                    >
                        Continue as guest
                    </button>
                </div>
            </div>

            <style jsx global>{`
        .ant-input {
          background: rgba(255,255,255,0.05) !important;
          border-color: rgba(255,255,255,0.1) !important;
          color: #fff !important;
        }
        .ant-input::placeholder {
          color: rgba(255,255,255,0.4) !important;
        }
        .ant-input:focus, .ant-input:hover {
          border-color: #6366f1 !important;
          box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2) !important;
        }
        .ant-input-affix-wrapper {
          background: rgba(255,255,255,0.05) !important;
          border-color: rgba(255,255,255,0.1) !important;
        }
        .ant-input-affix-wrapper:focus, .ant-input-affix-wrapper-focused {
          border-color: #6366f1 !important;
          box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2) !important;
        }
      `}</style>
        </div>
    );
}
