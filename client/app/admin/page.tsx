"use client";

import React, { useState, useEffect } from 'react';
import { Table, Card, Statistic, Button, message, Tag, Avatar, Space, Input, Spin, Result, Modal, Popconfirm, Tooltip } from 'antd';
import {
    UserOutlined,
    DownloadOutlined,
    ReloadOutlined,
    TeamOutlined,
    CalendarOutlined,
    ThunderboltOutlined,
    SearchOutlined,
    ArrowLeftOutlined,
    LockOutlined,
    ClockCircleOutlined,
    BarChartOutlined,
    DeleteOutlined,
    KeyOutlined,
    ExclamationCircleOutlined
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface User {
    id: number;
    email: string;
    name: string;
    avatarUrl: string | null;
    createdAt: string;
    updatedAt: string;
    lastLogin: string | null;
}

interface UserAnalytics {
    id: number;
    email: string;
    name: string;
    createdAt: string;
    lastLogin: string | null;
    totalUsageSeconds: number;
    sessionCount: number;
    lastSession: string | null;
}

interface Stats {
    totalUsers: number;
    usersToday: number;
    activeUsersLast7Days: number;
    totalUsageSeconds: number;
}

export default function AdminDashboard() {
    const [users, setUsers] = useState<User[]>([]);
    const [analytics, setAnalytics] = useState<UserAnalytics[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchText, setSearchText] = useState('');
    const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
    const [checkingAuth, setCheckingAuth] = useState(true);
    const [activeTab, setActiveTab] = useState<'users' | 'analytics'>('analytics');
    const [resetPasswordModal, setResetPasswordModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState<{ id: number; name: string } | null>(null);
    const [newPassword, setNewPassword] = useState('');
    const [actionLoading, setActionLoading] = useState(false);
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
                const response = await axios.get(`${API_URL}/api/admin/check`, {
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
            const [usersRes, statsRes, analyticsRes] = await Promise.all([
                axios.get(`${API_URL}/api/admin/users`, { headers }),
                axios.get(`${API_URL}/api/admin/stats`, { headers }),
                axios.get(`${API_URL}/api/admin/analytics`, { headers })
            ]);
            setUsers(usersRes.data.users);
            setStats(statsRes.data.stats);
            setAnalytics(analyticsRes.data.analytics);
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
        window.open(`${API_URL}/api/admin/users/export?token=${token}`, '_blank');
        message.success('Downloading users CSV...');
    };

    // Delete user
    const handleDeleteUser = async (userId: number, userName: string) => {
        const token = localStorage.getItem('authToken');
        if (!token) return;

        setActionLoading(true);
        try {
            await axios.delete(`${API_URL}/api/admin/users/${userId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            message.success(`User "${userName}" deleted successfully`);
            fetchData(); // Refresh the list
        } catch (error: any) {
            message.error(error.response?.data?.error || 'Failed to delete user');
        } finally {
            setActionLoading(false);
        }
    };

    // Reset password
    const handleResetPassword = async () => {
        if (!selectedUser || !newPassword) return;

        if (newPassword.length < 6) {
            message.error('Password must be at least 6 characters');
            return;
        }

        const token = localStorage.getItem('authToken');
        if (!token) return;

        setActionLoading(true);
        try {
            await axios.post(
                `${API_URL}/api/admin/users/${selectedUser.id}/reset-password`,
                { newPassword },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            message.success(`Password reset successfully for "${selectedUser.name}"`);
            setResetPasswordModal(false);
            setNewPassword('');
            setSelectedUser(null);
        } catch (error: any) {
            message.error(error.response?.data?.error || 'Failed to reset password');
        } finally {
            setActionLoading(false);
        }
    };

    // Open reset password modal
    const openResetPasswordModal = (userId: number, userName: string) => {
        setSelectedUser({ id: userId, name: userName });
        setNewPassword('');
        setResetPasswordModal(true);
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

    // Format seconds into hours and minutes
    const formatDuration = (seconds: number) => {
        if (seconds === 0) return '0m';
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        return `${minutes}m`;
    };

    const filteredUsers = users.filter(user =>
        user.name.toLowerCase().includes(searchText.toLowerCase()) ||
        user.email.toLowerCase().includes(searchText.toLowerCase())
    );

    const filteredAnalytics = analytics.filter(user =>
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
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 150,
            render: (record: User) => (
                <Space>
                    <Tooltip title="Reset Password">
                        <Button
                            type="text"
                            icon={<KeyOutlined style={{ color: '#fbbf24' }} />}
                            onClick={() => openResetPasswordModal(record.id, record.name)}
                            size="small"
                        />
                    </Tooltip>
                    <Popconfirm
                        title="Delete User"
                        description={`Are you sure you want to delete "${record.name}"? This cannot be undone.`}
                        onConfirm={() => handleDeleteUser(record.id, record.name)}
                        okText="Delete"
                        cancelText="Cancel"
                        okButtonProps={{ danger: true }}
                    >
                        <Tooltip title="Delete User">
                            <Button
                                type="text"
                                icon={<DeleteOutlined style={{ color: '#ef4444' }} />}
                                size="small"
                                danger
                            />
                        </Tooltip>
                    </Popconfirm>
                </Space>
            )
        }
    ];

    // Analytics columns with usage time
    const analyticsColumns = [
        {
            title: 'User',
            key: 'user',
            render: (record: UserAnalytics) => (
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
            title: '⏱️ Total Time',
            key: 'totalTime',
            render: (record: UserAnalytics) => (
                <div style={{
                    fontWeight: 600,
                    color: record.totalUsageSeconds > 0 ? '#22c55e' : 'rgba(255,255,255,0.4)',
                    fontSize: '16px'
                }}>
                    {formatDuration(record.totalUsageSeconds)}
                </div>
            ),
            sorter: (a: UserAnalytics, b: UserAnalytics) => a.totalUsageSeconds - b.totalUsageSeconds
        },
        {
            title: '📊 Sessions',
            dataIndex: 'sessionCount',
            key: 'sessions',
            render: (count: number) => <Tag color="purple">{count} sessions</Tag>
        },
        {
            title: 'Last Session',
            dataIndex: 'lastSession',
            key: 'lastSession',
            render: (date: string | null) => (
                <span style={{ color: date ? '#22c55e' : 'rgba(255,255,255,0.4)' }}>
                    {formatDate(date)}
                </span>
            )
        },
        {
            title: 'Joined',
            dataIndex: 'createdAt',
            key: 'createdAt',
            render: (date: string) => formatDate(date)
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
                <Card style={{ background: 'rgba(251, 191, 36, 0.1)', border: '1px solid rgba(251, 191, 36, 0.3)', borderRadius: '16px' }}>
                    <Statistic
                        title={<span style={{ color: 'rgba(255,255,255,0.6)' }}>Total Usage Time</span>}
                        value={formatDuration(stats?.totalUsageSeconds || 0)}
                        prefix={<ClockCircleOutlined style={{ color: '#fbbf24' }} />}
                        valueStyle={{ color: '#e4e4e7', fontSize: '32px' }}
                    />
                </Card>
            </div>

            {/* Tab Buttons */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
                <Button
                    type={activeTab === 'analytics' ? 'primary' : 'default'}
                    icon={<BarChartOutlined />}
                    onClick={() => setActiveTab('analytics')}
                    style={activeTab === 'analytics'
                        ? { background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none' }
                        : { background: 'rgba(255,255,255,0.1)', border: 'none', color: '#e4e4e7' }
                    }
                >
                    ⏱️ Usage Analytics
                </Button>
                <Button
                    type={activeTab === 'users' ? 'primary' : 'default'}
                    icon={<TeamOutlined />}
                    onClick={() => setActiveTab('users')}
                    style={activeTab === 'users'
                        ? { background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none' }
                        : { background: 'rgba(255,255,255,0.1)', border: 'none', color: '#e4e4e7' }
                    }
                >
                    👤 Users List
                </Button>
            </div>

            {/* Analytics Table */}
            {activeTab === 'analytics' && (
                <Card
                    style={{
                        background: 'rgba(30, 30, 50, 0.8)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '16px'
                    }}
                    title={
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ color: '#e4e4e7', fontSize: '18px' }}>
                                ⏱️ User Activity Analytics ({analytics.length})
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
                        columns={analyticsColumns}
                        dataSource={filteredAnalytics}
                        rowKey="id"
                        loading={loading}
                        pagination={{
                            pageSize: 10,
                            style: { padding: '16px' }
                        }}
                        style={{ background: 'transparent' }}
                    />
                </Card>
            )}

            {/* Users Table */}
            {activeTab === 'users' && (
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
            )}

            {/* Reset Password Modal */}
            <Modal
                title={
                    <span style={{ color: '#e4e4e7' }}>
                        <KeyOutlined style={{ marginRight: '8px', color: '#fbbf24' }} />
                        Reset Password for {selectedUser?.name}
                    </span>
                }
                open={resetPasswordModal}
                onOk={handleResetPassword}
                onCancel={() => {
                    setResetPasswordModal(false);
                    setNewPassword('');
                    setSelectedUser(null);
                }}
                okText="Reset Password"
                okButtonProps={{
                    loading: actionLoading,
                    style: { background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none' }
                }}
                cancelButtonProps={{ style: { background: 'rgba(255,255,255,0.1)', border: 'none', color: '#e4e4e7' } }}
                className="admin-modal"
            >
                <div style={{ padding: '20px 0' }}>
                    <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '16px' }}>
                        Enter a new password for <strong style={{ color: '#e4e4e7' }}>{selectedUser?.name}</strong>
                    </p>
                    <Input.Password
                        placeholder="New password (min 6 characters)"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: '#e4e4e7'
                        }}
                        size="large"
                    />
                </div>
            </Modal>

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
        .admin-modal .ant-modal-content {
          background: rgba(30, 30, 50, 0.95) !important;
          border: 1px solid rgba(255,255,255,0.1) !important;
        }
        .admin-modal .ant-modal-header {
          background: transparent !important;
          border-bottom: 1px solid rgba(255,255,255,0.1) !important;
        }
        .admin-modal .ant-modal-footer {
          background: transparent !important;
          border-top: 1px solid rgba(255,255,255,0.1) !important;
        }
        .admin-modal .ant-modal-close {
          color: rgba(255,255,255,0.5) !important;
        }
        .ant-popconfirm .ant-popover-inner {
          background: rgba(30, 30, 50, 0.95) !important;
          border: 1px solid rgba(255,255,255,0.1) !important;
        }
        .ant-popconfirm .ant-popconfirm-message-title {
          color: #e4e4e7 !important;
        }
        .ant-popconfirm .ant-popconfirm-description {
          color: rgba(255,255,255,0.7) !important;
        }
      `}</style>
        </div>
    );
}
