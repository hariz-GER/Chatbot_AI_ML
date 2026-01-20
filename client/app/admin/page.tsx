"use client";

import React, { useState, useEffect } from 'react';
import { Table, Card, Statistic, Button, message, Tag, Avatar, Space, Input, Spin, Result } from 'antd';
import {
    UserOutlined,
    DownloadOutlined,
    ReloadOutlined,
    TeamOutlined,
    CalendarOutlined,
    ThunderboltOutlined,
    SearchOutlined,
    ArrowLeftOutlined,
    LockOutlined
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import axios from 'axios';

interface User {
    id: number;
    email: string;
    name: string;
    avatarUrl: string | null;
    createdAt: string;
    updatedAt: string;
    lastLogin: string | null;
}

interface Stats {
    totalUsers: number;
    usersToday: number;
    activeUsersLast7Days: number;
}

export default function AdminDashboard() {
    const [users, setUsers] = useState<User[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchText, setSearchText] = useState('');
    const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
    const [checkingAuth, setCheckingAuth] = useState(true);
    const router = useRouter();

    // Check if user is admin
    useEffect(() => {
        const checkAdmin = async () => {
            const token = localStorage.getItem('authToken');
            if (!token) {
                setIsAdmin(false);
                setCheckingAuth(false);
                return;
            }

            try {
                const response = await axios.get('http://localhost:4000/api/admin/check', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setIsAdmin(response.data.isAdmin);
            } catch {
                setIsAdmin(false);
            } finally {
                setCheckingAuth(false);
            }
        };
        checkAdmin();
    }, []);

    const fetchData = async () => {
        const token = localStorage.getItem('authToken');
        if (!token) return;

        setLoading(true);
        try {
            const headers = { Authorization: `Bearer ${token}` };
            const [usersRes, statsRes] = await Promise.all([
                axios.get('http://localhost:4000/api/admin/users', { headers }),
                axios.get('http://localhost:4000/api/admin/stats', { headers })
            ]);
            setUsers(usersRes.data.users);
            setStats(statsRes.data.stats);
        } catch (error: any) {
            if (error.response?.status === 403) {
                message.error('Access denied. Admin privileges required.');
                setIsAdmin(false);
            } else {
                message.error('Failed to fetch data');
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isAdmin) {
            fetchData();
        }
    }, [isAdmin]);

    const handleExport = () => {
        const token = localStorage.getItem('authToken');
        // For CSV export, we need to add token to URL or use a different approach
        window.open(`http://localhost:4000/api/admin/users/export?token=${token}`, '_blank');
        message.success('Downloading users CSV...');
    };

    // Show loading while checking auth
    if (checkingAuth) {
        return (
            <div style={{
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <Spin size="large" />
            </div>
        );
    }

    // Show access denied if not admin
    if (!isAdmin) {
        return (
            <div style={{
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <Result
                    icon={<LockOutlined style={{ color: '#ef4444' }} />}
                    title={<span style={{ color: '#e4e4e7' }}>Access Denied</span>}
                    subTitle={<span style={{ color: 'rgba(255,255,255,0.5)' }}>You don't have permission to access the admin dashboard. Please login with an admin account.</span>}
                    extra={[
                        <Button key="home" onClick={() => router.push('/')} style={{ marginRight: '8px' }}>
                            Go to Chat
                        </Button>,
                        <Button key="login" type="primary" onClick={() => router.push('/auth')}>
                            Login
                        </Button>
                    ]}
                />
            </div>
        );
    }

    const formatDate = (date: string | null) => {
        if (!date) return 'Never';
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const filteredUsers = users.filter(user =>
        user.name.toLowerCase().includes(searchText.toLowerCase()) ||
        user.email.toLowerCase().includes(searchText.toLowerCase())
    );

    const columns = [
        {
            title: 'User',
            key: 'user',
            render: (record: User) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Avatar
                        style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
                        size={40}
                    >
                        {record.name.charAt(0).toUpperCase()}
                    </Avatar>
                    <div>
                        <div style={{ fontWeight: 600, color: '#e4e4e7' }}>{record.name}</div>
                        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>{record.email}</div>
                    </div>
                </div>
            )
        },
        {
            title: 'ID',
            dataIndex: 'id',
            key: 'id',
            width: 80,
            render: (id: number) => <Tag color="blue">#{id}</Tag>
        },
        {
            title: 'Joined',
            dataIndex: 'createdAt',
            key: 'createdAt',
            render: (date: string) => formatDate(date)
        },
        {
            title: 'Last Login',
            dataIndex: 'lastLogin',
            key: 'lastLogin',
            render: (date: string | null) => (
                <span style={{ color: date ? '#22c55e' : 'rgba(255,255,255,0.4)' }}>
                    {formatDate(date)}
                </span>
            )
        },
        {
            title: 'Status',
            key: 'status',
            render: (record: User) => {
                const isActive = record.lastLogin &&
                    new Date(record.lastLogin) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                return (
                    <Tag color={isActive ? 'green' : 'default'}>
                        {isActive ? 'Active' : 'Inactive'}
                    </Tag>
                );
            }
        }
    ];

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)',
            padding: '24px'
        }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '32px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <Button
                        type="text"
                        icon={<ArrowLeftOutlined />}
                        onClick={() => router.push('/')}
                        style={{ color: '#e4e4e7' }}
                    />
                    <div style={{
                        width: '48px',
                        height: '48px',
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <ThunderboltOutlined style={{ fontSize: '24px', color: '#fff' }} />
                    </div>
                    <div>
                        <h1 style={{ color: '#e4e4e7', margin: 0, fontSize: '24px' }}>Admin Dashboard</h1>
                        <p style={{ color: 'rgba(255,255,255,0.5)', margin: 0 }}>Manage users and view analytics</p>
                    </div>
                </div>

                <Space>
                    <Button
                        icon={<ReloadOutlined />}
                        onClick={fetchData}
                        loading={loading}
                        style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#e4e4e7' }}
                    >
                        Refresh
                    </Button>
                    <Button
                        type="primary"
                        icon={<DownloadOutlined />}
                        onClick={handleExport}
                        style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)', border: 'none' }}
                    >
                        Export to Excel
                    </Button>
                </Space>
            </div>

            {/* Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '32px' }}>
                <Card style={{ background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: '16px' }}>
                    <Statistic
                        title={<span style={{ color: 'rgba(255,255,255,0.6)' }}>Total Users</span>}
                        value={stats?.totalUsers || 0}
                        prefix={<TeamOutlined style={{ color: '#6366f1' }} />}
                        valueStyle={{ color: '#e4e4e7', fontSize: '32px' }}
                    />
                </Card>
                <Card style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '16px' }}>
                    <Statistic
                        title={<span style={{ color: 'rgba(255,255,255,0.6)' }}>New Users Today</span>}
                        value={stats?.usersToday || 0}
                        prefix={<CalendarOutlined style={{ color: '#22c55e' }} />}
                        valueStyle={{ color: '#e4e4e7', fontSize: '32px' }}
                    />
                </Card>
                <Card style={{ background: 'rgba(236, 72, 153, 0.1)', border: '1px solid rgba(236, 72, 153, 0.3)', borderRadius: '16px' }}>
                    <Statistic
                        title={<span style={{ color: 'rgba(255,255,255,0.6)' }}>Active (7 days)</span>}
                        value={stats?.activeUsersLast7Days || 0}
                        prefix={<UserOutlined style={{ color: '#ec4899' }} />}
                        valueStyle={{ color: '#e4e4e7', fontSize: '32px' }}
                    />
                </Card>
            </div>

            {/* Users Table */}
            <Card
                style={{
                    background: 'rgba(30, 30, 50, 0.8)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '16px'
                }}
                title={
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ color: '#e4e4e7', fontSize: '18px' }}>
                            Registered Users ({users.length})
                        </span>
                        <Input
                            placeholder="Search users..."
                            prefix={<SearchOutlined style={{ color: 'rgba(255,255,255,0.4)' }} />}
                            value={searchText}
                            onChange={e => setSearchText(e.target.value)}
                            style={{
                                width: '250px',
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '8px'
                            }}
                        />
                    </div>
                }
                headStyle={{ background: 'transparent', borderBottom: '1px solid rgba(255,255,255,0.1)' }}
                bodyStyle={{ padding: 0 }}
            >
                <Table
                    columns={columns}
                    dataSource={filteredUsers}
                    rowKey="id"
                    loading={loading}
                    pagination={{
                        pageSize: 10,
                        style: { padding: '16px' }
                    }}
                    style={{ background: 'transparent' }}
                />
            </Card>

            <style jsx global>{`
        .ant-table {
          background: transparent !important;
        }
        .ant-table-thead > tr > th {
          background: rgba(255,255,255,0.05) !important;
          color: rgba(255,255,255,0.7) !important;
          border-bottom: 1px solid rgba(255,255,255,0.1) !important;
        }
        .ant-table-tbody > tr > td {
          background: transparent !important;
          color: #e4e4e7 !important;
          border-bottom: 1px solid rgba(255,255,255,0.05) !important;
        }
        .ant-table-tbody > tr:hover > td {
          background: rgba(99, 102, 241, 0.1) !important;
        }
        .ant-pagination-item {
          background: rgba(255,255,255,0.05) !important;
          border-color: rgba(255,255,255,0.1) !important;
        }
        .ant-pagination-item a {
          color: #e4e4e7 !important;
        }
        .ant-pagination-item-active {
          background: #6366f1 !important;
          border-color: #6366f1 !important;
        }
        .ant-pagination-prev button, .ant-pagination-next button {
          color: #e4e4e7 !important;
        }
        .ant-card {
          color: #e4e4e7;
        }
        .ant-input {
          background: rgba(255,255,255,0.05) !important;
          color: #e4e4e7 !important;
          border-color: rgba(255,255,255,0.1) !important;
        }
        .ant-input::placeholder {
          color: rgba(255,255,255,0.4) !important;
        }
        .ant-empty-description {
          color: rgba(255,255,255,0.5) !important;
        }
      `}</style>
        </div>
    );
}
