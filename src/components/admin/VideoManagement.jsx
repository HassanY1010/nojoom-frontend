import React, { useState, useEffect } from 'react';
import api from '../../services/api';  // بدلاً من ../services/api

const VideoManagement = () => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0
  });
  const [search, setSearch] = useState('');
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  const fetchVideos = async (page = 1, searchTerm = '') => {
    setLoading(true);
    try {
      const response = await api.get(`/admin/videos?page=${page}&limit=10&search=${searchTerm}`);
      setVideos(response.data.videos);
      setPagination({
        page: response.data.page,
        totalPages: response.data.totalPages,
        total: response.data.total
      });
    } catch (error) {
      console.error('Failed to fetch videos:', error);
      alert('Failed to load videos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchVideos(1, search);
  };

  const handleDelete = async (videoId, reason = 'Inappropriate content') => {
    if (!window.confirm('Are you sure you want to delete this video?')) return;
    
    setActionLoading(videoId);
    try {
      await api.delete(`/admin/videos/${videoId}`, { data: { deletion_reason: reason } });
      fetchVideos(pagination.page, search);
      alert('Video deleted successfully');
    } catch (error) {
      console.error('Failed to delete video:', error);
      alert('Failed to delete video');
    } finally {
      setActionLoading(null);
    }
  };

  const handlePin = async (videoId) => {
    setActionLoading(videoId);
    try {
      await api.post(`/admin/videos/${videoId}/pin`);
      fetchVideos(pagination.page, search);
      alert('Video pinned successfully');
    } catch (error) {
      console.error('Failed to pin video:', error);
      alert('Failed to pin video');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnpin = async (videoId) => {
    setActionLoading(videoId);
    try {
      await api.post(`/admin/videos/${videoId}/unpin`);
      fetchVideos(pagination.page, search);
      alert('Video unpinned successfully');
    } catch (error) {
      console.error('Failed to unpin video:', error);
      alert('Failed to unpin video');
    } finally {
      setActionLoading(null);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'N/A';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
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

  const getStatusBadge = (video) => {
    if (video.is_pinned) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-900 text-yellow-200">
          Pinned
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-900 text-green-200">
        Active
      </span>
    );
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-4">Video Management</h2>
        
        {/* Search Bar */}
        <form onSubmit={handleSearch} className="mb-6">
          <div className="flex gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search videos by description or username..."
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
                fetchVideos(1, '');
              }}
              className="bg-gray-700 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition-colors"
            >
              Clear
            </button>
          </div>
        </form>

        {/* Videos Table */}
        <div className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-400">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
              <p className="mt-2">Loading videos...</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-800">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Video</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">User</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Stats</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Uploaded</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {videos.map((video) => (
                      <tr key={video.id} className="hover:bg-gray-800 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-16 w-28 bg-gray-700 rounded overflow-hidden">
                              <video 
                                className="h-full w-full object-cover"
                                poster={`${import.meta.env.VITE_API_URL}/${video.path}?thumb=true`}
                              >
                                <source src={`${import.meta.env.VITE_API_URL}/${video.path}`} type="video/mp4" />
                              </video>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-white max-w-xs">
                                {video.description || 'No description'}
                              </div>
                              <div className="text-sm text-gray-400 mt-1">
                                {formatFileSize(video.file_size)}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-white">{video.username}</div>
                          <div className="text-sm text-gray-400">{video.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-1">
                              <span>👁️</span>
                              <span>{video.views || 0} views</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <span>❤️</span>
                              <span>{video.likes_count || 0} likes</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <span>🚩</span>
                              <span>{video.pending_reports_count || 0} reports</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(video)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                          {formatDate(video.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          {video.is_pinned ? (
                            <button
                              onClick={() => handleUnpin(video.id)}
                              disabled={actionLoading === video.id}
                              className="text-yellow-400 hover:text-yellow-300 disabled:opacity-50"
                            >
                              {actionLoading === video.id ? '...' : 'Unpin'}
                            </button>
                          ) : (
                            <button
                              onClick={() => handlePin(video.id)}
                              disabled={actionLoading === video.id}
                              className="text-blue-400 hover:text-blue-300 disabled:opacity-50"
                            >
                              {actionLoading === video.id ? '...' : 'Pin'}
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(video.id)}
                            disabled={actionLoading === video.id}
                            className="text-red-400 hover:text-red-300 disabled:opacity-50"
                          >
                            {actionLoading === video.id ? '...' : 'Delete'}
                          </button>
                          <button
                            onClick={() => setSelectedVideo(video)}
                            className="text-purple-400 hover:text-purple-300"
                          >
                            Details
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
                    Showing {videos.length} of {pagination.total} videos
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => fetchVideos(pagination.page - 1, search)}
                      disabled={pagination.page === 1 || loading}
                      className="px-3 py-1 rounded bg-gray-700 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 transition-colors"
                    >
                      Previous
                    </button>
                    <span className="px-3 py-1 text-white">
                      Page {pagination.page} of {pagination.totalPages}
                    </span>
                    <button
                      onClick={() => fetchVideos(pagination.page + 1, search)}
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

      {/* Video Detail Modal */}
      {selectedVideo && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-white">Video Details</h3>
                <button
                  onClick={() => setSelectedVideo(null)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-6">
                {/* Video Player */}
                <div className="bg-black rounded-lg overflow-hidden">
                  <video 
                    className="w-full h-64 object-contain bg-black"
                    controls
                    autoPlay
                  >
                    <source src={`${import.meta.env.VITE_API_URL}/${selectedVideo.path}`} type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                </div>

                {/* Video Info */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-lg font-semibold text-white mb-3">Video Information</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Description:</span>
                        <span className="text-white text-right">
                          {selectedVideo.description || 'No description'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">File Size:</span>
                        <span className="text-white">{formatFileSize(selectedVideo.file_size)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Views:</span>
                        <span className="text-white">{selectedVideo.views || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Likes:</span>
                        <span className="text-white">{selectedVideo.likes_count || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Status:</span>
                        <span>{getStatusBadge(selectedVideo)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Uploaded:</span>
                        <span className="text-white">{formatDate(selectedVideo.created_at)}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-lg font-semibold text-white mb-3">User Information</h4>
                    <div className="flex items-center space-x-3 mb-4">
                      <img
                        className="h-12 w-12 rounded-full"
                        src={selectedVideo.avatar || '/default-avatar.png'}
                        alt={selectedVideo.username}
                      />
                      <div>
                        <div className="text-white font-medium">{selectedVideo.username}</div>
                        <div className="text-gray-400 text-sm">{selectedVideo.email}</div>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Pending Reports:</span>
                        <span className="text-white">{selectedVideo.pending_reports_count || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="border-t border-gray-700 pt-4">
                  <h4 className="text-lg font-semibold text-white mb-3">Quick Actions</h4>
                  <div className="flex space-x-3">
                    {selectedVideo.is_pinned ? (
                      <button
                        onClick={() => {
                          handleUnpin(selectedVideo.id);
                          setSelectedVideo(null);
                        }}
                        className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors"
                      >
                        Unpin Video
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          handlePin(selectedVideo.id);
                          setSelectedVideo(null);
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                      >
                        Pin Video
                      </button>
                    )}
                    <button
                      onClick={() => {
                        handleDelete(selectedVideo.id);
                        setSelectedVideo(null);
                      }}
                      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                    >
                      Delete Video
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoManagement;