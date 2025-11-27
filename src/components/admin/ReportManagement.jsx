import React, { useState, useEffect } from 'react';
import api from '../../services/api';  // بدلاً من ../services/api

const ReportManagement = () => {
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0
  });
  const [statusFilter, setStatusFilter] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [stats, setStats] = useState({
    pending: 0,
    resolved: 0,
    rejected: 0,
    total: 0
  });

  const fetchReports = async (page = 1, status = '') => {
    setLoading(true);
    try {
      const response = await api.get(`/admin/reports?page=${page}&limit=10&status=${status}`);
      setReports(response.data.reports);
      setPagination({
        page: response.data.page,
        totalPages: response.data.totalPages,
        total: response.data.total
      });
      setStats(response.data.stats);
    } catch (error) {
      console.error('Failed to fetch reports:', error);
      alert('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/admin/reports/stats');
      setStats(response.data.basicStats);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  useEffect(() => {
    fetchReports();
    fetchStats();
  }, []);

  const handleStatusFilter = (status) => {
    setStatusFilter(status);
    fetchReports(1, status);
  };

  const handleStatusUpdate = async (reportId, status, adminNotes = '') => {
    setActionLoading(reportId);
    try {
      await api.patch(`/admin/reports/${reportId}/status`, { status, admin_notes: adminNotes });
      fetchReports(pagination.page, statusFilter);
      fetchStats();
      setSelectedReport(null);
      alert('Report status updated successfully');
    } catch (error) {
      console.error('Failed to update report status:', error);
      alert('Failed to update report status');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteVideo = async (reportId, reason = 'Violation of community guidelines') => {
    if (!window.confirm('Are you sure you want to delete this video?')) return;
    
    setActionLoading(reportId);
    try {
      await api.post(`/admin/reports/${reportId}/delete-video`, { deletion_reason: reason });
      fetchReports(pagination.page, statusFilter);
      fetchStats();
      setSelectedReport(null);
      alert('Video deleted successfully');
    } catch (error) {
      console.error('Failed to delete video:', error);
      alert('Failed to delete video');
    } finally {
      setActionLoading(null);
    }
  };

  const handleBanUser = async (reportId, reason = 'Multiple violations') => {
    if (!window.confirm('Are you sure you want to ban this user?')) return;
    
    setActionLoading(reportId);
    try {
      await api.post(`/admin/reports/${reportId}/ban-user`, { ban_reason: reason });
      fetchReports(pagination.page, statusFilter);
      fetchStats();
      setSelectedReport(null);
      alert('User banned successfully');
    } catch (error) {
      console.error('Failed to ban user:', error);
      alert('Failed to ban user');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-900 text-yellow-200', label: 'Pending' },
      resolved: { color: 'bg-green-900 text-green-200', label: 'Resolved' },
      rejected: { color: 'bg-red-900 text-red-200', label: 'Rejected' }
    };
    
    const config = statusConfig[status] || statusConfig.pending;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const getReasonBadge = (reason) => {
    const reasonConfig = {
      spam: { color: 'bg-gray-600 text-white', label: 'Spam' },
      harassment: { color: 'bg-red-600 text-white', label: 'Harassment' },
      inappropriate: { color: 'bg-orange-600 text-white', label: 'Inappropriate' },
      copyright: { color: 'bg-purple-600 text-white', label: 'Copyright' },
      other: { color: 'bg-blue-600 text-white', label: 'Other' }
    };
    
    const config = reasonConfig[reason] || reasonConfig.other;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-4">Report Management</h2>
        
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="text-2xl font-bold text-white">{stats.total}</div>
            <div className="text-gray-400 text-sm">Total Reports</div>
          </div>
          <div className="bg-yellow-900/20 rounded-lg p-4 border border-yellow-700">
            <div className="text-2xl font-bold text-yellow-400">{stats.pending}</div>
            <div className="text-yellow-400 text-sm">Pending</div>
          </div>
          <div className="bg-green-900/20 rounded-lg p-4 border border-green-700">
            <div className="text-2xl font-bold text-green-400">{stats.resolved}</div>
            <div className="text-green-400 text-sm">Resolved</div>
          </div>
          <div className="bg-red-900/20 rounded-lg p-4 border border-red-700">
            <div className="text-2xl font-bold text-red-400">{stats.rejected}</div>
            <div className="text-red-400 text-sm">Rejected</div>
          </div>
        </div>

        {/* Status Filters */}
        <div className="flex space-x-2 mb-6">
          <button
            onClick={() => handleStatusFilter('')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              statusFilter === '' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            All Reports
          </button>
          <button
            onClick={() => handleStatusFilter('pending')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              statusFilter === 'pending' ? 'bg-yellow-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            Pending ({stats.pending})
          </button>
          <button
            onClick={() => handleStatusFilter('resolved')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              statusFilter === 'resolved' ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            Resolved
          </button>
          <button
            onClick={() => handleStatusFilter('rejected')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              statusFilter === 'rejected' ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            Rejected
          </button>
        </div>

        {/* Reports List */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8 text-gray-400">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
              <p className="mt-2">Loading reports...</p>
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <div className="text-4xl mb-2">📝</div>
              <p>No reports found</p>
              <p className="text-sm mt-1">Reports will appear here when users submit them</p>
            </div>
          ) : (
            reports.map((report) => (
              <div
                key={report.id}
                className="bg-gray-900 rounded-lg border border-gray-700 p-4 hover:border-gray-600 transition-colors cursor-pointer"
                onClick={() => setSelectedReport(report)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      {getStatusBadge(report.status)}
                      {getReasonBadge(report.reason)}
                    </div>
                    
                    <p className="text-white mb-2">{report.description || 'No description provided'}</p>
                    
                    <div className="text-sm text-gray-400 space-y-1">
                      <div>
                        <strong>Reporter:</strong> {report.reporter_username}
                      </div>
                      {report.reported_username && (
                        <div>
                          <strong>Reported User:</strong> {report.reported_username}
                        </div>
                      )}
                      {report.video_description && (
                        <div>
                          <strong>Video:</strong> {report.video_description}
                        </div>
                      )}
                      <div>
                        <strong>Submitted:</strong> {formatDate(report.created_at)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <button className="text-purple-400 hover:text-purple-300 text-sm">
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {reports.length > 0 && (
          <div className="mt-6 flex justify-center space-x-2">
            <button
              onClick={() => fetchReports(pagination.page - 1, statusFilter)}
              disabled={pagination.page === 1 || loading}
              className="px-4 py-2 rounded bg-gray-800 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-white">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              onClick={() => fetchReports(pagination.page + 1, statusFilter)}
              disabled={pagination.page === pagination.totalPages || loading}
              className="px-4 py-2 rounded bg-gray-800 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Report Detail Modal */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-white">Report Details</h3>
                <button
                  onClick={() => setSelectedReport(null)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-6">
                {/* Report Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm text-gray-400">Status</label>
                      <div className="mt-1">{getStatusBadge(selectedReport.status)}</div>
                    </div>
                    <div>
                      <label className="text-sm text-gray-400">Reason</label>
                      <div className="mt-1">{getReasonBadge(selectedReport.reason)}</div>
                    </div>
                    <div>
                      <label className="text-sm text-gray-400">Reporter</label>
                      <div className="text-white mt-1">{selectedReport.reporter_username}</div>
                    </div>
                    <div>
                      <label className="text-sm text-gray-400">Submitted</label>
                      <div className="text-white mt-1">{formatDate(selectedReport.created_at)}</div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {selectedReport.reported_username && (
                      <div>
                        <label className="text-sm text-gray-400">Reported User</label>
                        <div className="text-white mt-1">{selectedReport.reported_username}</div>
                      </div>
                    )}
                    {selectedReport.video_description && (
                      <div>
                        <label className="text-sm text-gray-400">Video Description</label>
                        <div className="text-white mt-1">{selectedReport.video_description}</div>
                      </div>
                    )}
                    {selectedReport.admin_username && (
                      <div>
                        <label className="text-sm text-gray-400">Handled By</label>
                        <div className="text-white mt-1">{selectedReport.admin_username}</div>
                      </div>
                    )}
                    {selectedReport.resolved_at && (
                      <div>
                        <label className="text-sm text-gray-400">Resolved At</label>
                        <div className="text-white mt-1">{formatDate(selectedReport.resolved_at)}</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="text-sm text-gray-400">Report Description</label>
                  <div className="text-white bg-gray-800 p-3 rounded mt-1">
                    {selectedReport.description || 'No description provided'}
                  </div>
                </div>

                {/* Admin Notes */}
                {selectedReport.admin_notes && (
                  <div>
                    <label className="text-sm text-gray-400">Admin Notes</label>
                    <div className="text-white bg-gray-800 p-3 rounded mt-1">
                      {selectedReport.admin_notes}
                    </div>
                  </div>
                )}

                {/* Video Preview */}
                {selectedReport.video_path && !selectedReport.deleted_by_admin && (
                  <div>
                    <label className="text-sm text-gray-400">Reported Video</label>
                    <div className="mt-1 bg-gray-800 rounded overflow-hidden">
                      <video className="w-full max-h-64" controls>
                        <source src={`${import.meta.env.VITE_API_URL}/${selectedReport.video_path}`} type="video/mp4" />
                      </video>
                    </div>
                  </div>
                )}

                {/* Actions */}
                {selectedReport.status === 'pending' && (
                  <div className="border-t border-gray-700 pt-4">
                    <h4 className="text-lg font-medium text-white mb-3">Actions</h4>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleStatusUpdate(selectedReport.id, 'resolved', 'Issue resolved after review')}
                        disabled={actionLoading === selectedReport.id}
                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50"
                      >
                        {actionLoading === selectedReport.id ? 'Processing...' : 'Mark Resolved'}
                      </button>
                      <button
                        onClick={() => handleStatusUpdate(selectedReport.id, 'rejected', 'False or invalid report')}
                        disabled={actionLoading === selectedReport.id}
                        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors disabled:opacity-50"
                      >
                        {actionLoading === selectedReport.id ? 'Processing...' : 'Reject Report'}
                      </button>
                      {selectedReport.video_id && !selectedReport.deleted_by_admin && (
                        <button
                          onClick={() => handleDeleteVideo(selectedReport.id)}
                          disabled={actionLoading === selectedReport.id}
                          className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors disabled:opacity-50"
                        >
                          {actionLoading === selectedReport.id ? 'Processing...' : 'Delete Video'}
                        </button>
                      )}
                      {selectedReport.reported_user_id && (
                        <button
                          onClick={() => handleBanUser(selectedReport.id)}
                          disabled={actionLoading === selectedReport.id}
                          className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors disabled:opacity-50"
                        >
                          {actionLoading === selectedReport.id ? 'Processing...' : 'Ban User'}
                        </button>
                      )}
                    </div>
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

export default ReportManagement;