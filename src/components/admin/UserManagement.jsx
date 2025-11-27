import React, { useState, useEffect } from 'react';
import api from '../../services/api';  // بدلاً من ../services/api

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0
  });
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  const fetchUsers = async (page = 1, searchTerm = '') => {
    setLoading(true);
    try {
      const response = await api.get(`/admin/users?page=${page}&limit=10&search=${searchTerm}`);
      setUsers(response.data.users);
      setPagination({
        page: response.data.page,
        totalPages: response.data.totalPages,
        total: response.data.total
      });
    } catch (error) {
      console.error('Failed to fetch users:', error);
      alert('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchUsers(1, search);
  };

  const handleBan = async (userId, reason = 'Violation of community guidelines') => {
    if (!window.confirm('Are you sure you want to ban this user?')) return;
    
    setActionLoading(userId);
    try {
      await api.post(`/admin/users/${userId}/ban`, { reason });
      fetchUsers(pagination.page, search);
      alert('User banned successfully');
    } catch (error) {
      console.error('Failed to ban user:', error);
      alert('Failed to ban user');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnban = async (userId) => {
    setActionLoading(userId);
    try {
      await api.post(`/admin/users/${userId}/unban`);
      fetchUsers(pagination.page, search);
      alert('User unbanned successfully');
    } catch (error) {
      console.error('Failed to unban user:', error);
      alert('Failed to unban user');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
    
    setActionLoading(userId);
    try {
      await api.delete(`/admin/users/${userId}`);
      fetchUsers(pagination.page, search);
      alert('User deleted successfully');
    } catch (error) {
      console.error('Failed to delete user:', error);
      alert('Failed to delete user');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    setActionLoading(userId);
    try {
      await api.put(`/admin/users/${userId}`, { role: newRole });
      fetchUsers(pagination.page, search);
      alert('User role updated successfully');
    } catch (error) {
      console.error('Failed to update user role:', error);
      alert('Failed to update user role');
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadge = (user) => {
    if (user.is_banned) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-900 text-red-200">
          Banned
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-900 text-green-200">
        Active
      </span>
    );
  };

  const getRoleBadge = (role) => {
    const roleConfig = {
      admin: { color: 'bg-purple-900 text-purple-200', label: 'Admin' },
      moderator: { color: 'bg-blue-900 text-blue-200', label: 'Moderator' },
      user: { color: 'bg-gray-900 text-gray-200', label: 'User' }
    };
    
    const config = roleConfig[role] || roleConfig.user;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-4">User Management</h2>
        
        {/* Search Bar */}
        <form onSubmit={handleSearch} className="mb-6">
          <div className="flex gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search users by username or email..."
              className="flex-1 bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <button
              type="submit"
              className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors"
            >
              Search
            </button>
            <button
              type="button"
              onClick={() => {
                setSearch('');
                fetchUsers(1, '');
              }}
              className="bg-gray-700 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition-colors"
            >
              Clear
            </button>
          </div>
        </form>

        {/* Users Table */}
        <div className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-400">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
              <p className="mt-2">Loading users...</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-800">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">User</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Role</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Followers</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Joined</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-800 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <img
                                className="h-10 w-10 rounded-full"
                                src={user.avatar || '/default-avatar.png'}
                                alt={user.username}
                              />
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-white">{user.username}</div>
                              <div className="text-sm text-gray-400">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <select
                            value={user.role}
                            onChange={(e) => handleRoleChange(user.id, e.target.value)}
                            disabled={actionLoading === user.id}
                            className="bg-gray-800 text-white px-2 py-1 rounded border border-gray-600 text-sm disabled:opacity-50"
                          >
                            <option value="user">User</option>
                            <option value="moderator">Moderator</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(user)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                          {user.followers_count || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                          {formatDate(user.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          {user.is_banned ? (
                            <button
                              onClick={() => handleUnban(user.id)}
                              disabled={actionLoading === user.id}
                              className="text-green-400 hover:text-green-300 disabled:opacity-50"
                            >
                              {actionLoading === user.id ? '...' : 'Unban'}
                            </button>
                          ) : (
                            <button
                              onClick={() => handleBan(user.id)}
                              disabled={actionLoading === user.id}
                              className="text-yellow-400 hover:text-yellow-300 disabled:opacity-50"
                            >
                              {actionLoading === user.id ? '...' : 'Ban'}
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(user.id)}
                            disabled={actionLoading === user.id}
                            className="text-red-400 hover:text-red-300 disabled:opacity-50"
                          >
                            {actionLoading === user.id ? '...' : 'Delete'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="px-6 py-4 bg-gray-800 border-t border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-400">
                    Showing {users.length} of {pagination.total} users
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => fetchUsers(pagination.page - 1, search)}
                      disabled={pagination.page === 1 || loading}
                      className="px-3 py-1 rounded bg-gray-700 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 transition-colors"
                    >
                      Previous
                    </button>
                    <span className="px-3 py-1 text-white">
                      Page {pagination.page} of {pagination.totalPages}
                    </span>
                    <button
                      onClick={() => fetchUsers(pagination.page + 1, search)}
                      disabled={pagination.page === pagination.totalPages || loading}
                      className="px-3 py-1 rounded bg-gray-700 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* User Detail Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-white">User Details</h3>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <img
                    className="h-16 w-16 rounded-full"
                    src={selectedUser.avatar || '/default-avatar.png'}
                    alt={selectedUser.username}
                  />
                  <div>
                    <h4 className="text-lg font-bold text-white">{selectedUser.username}</h4>
                    <p className="text-gray-400">{selectedUser.email}</p>
                    <div className="flex space-x-2 mt-1">
                      {getRoleBadge(selectedUser.role)}
                      {getStatusBadge(selectedUser)}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <label className="text-gray-400">Followers</label>
                    <p className="text-white">{selectedUser.followers_count || 0}</p>
                  </div>
                  <div>
                    <label className="text-gray-400">Following</label>
                    <p className="text-white">{selectedUser.following_count || 0}</p>
                  </div>
                  <div>
                    <label className="text-gray-400">Joined</label>
                    <p className="text-white">{formatDate(selectedUser.created_at)}</p>
                  </div>
                  <div>
                    <label className="text-gray-400">Last Login</label>
                    <p className="text-white">
                      {selectedUser.last_login ? formatDate(selectedUser.last_login) : 'Never'}
                    </p>
                  </div>
                </div>

                {selectedUser.ban_reason && (
                  <div className="bg-red-900/20 border border-red-800 rounded p-3">
                    <h5 className="text-red-400 font-medium mb-1">Ban Reason</h5>
                    <p className="text-red-300 text-sm">{selectedUser.ban_reason}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;