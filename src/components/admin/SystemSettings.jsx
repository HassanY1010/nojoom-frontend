import React, { useState, useEffect } from 'react';
import api from '../../services/api';  // بدلاً من ../services/api

const SystemSettings = () => {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/system-settings');
      const settingsMap = {};
      response.data.settings.forEach(setting => {
        settingsMap[setting.setting_key] = setting.setting_value;
      });
      setSettings(settingsMap);
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      setMessage('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      await api.put('/admin/system-settings', { settings });
      setMessage('Settings saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Failed to save settings:', error);
      setMessage('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset all settings to default?')) {
      const defaultSettings = {
        video_upload_enabled: 'true',
        user_registration_enabled: 'true',
        chat_enabled: 'true',
        max_video_size: '10485760',
        max_video_duration: '300',
        auto_ban_reports_threshold: '5',
        maintenance_mode: 'false'
      };
      setSettings(defaultSettings);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-8 text-gray-400">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-2">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">System Settings</h2>
        <p className="text-gray-400">Configure platform settings and features</p>
      </div>

      {message && (
        <div className={`p-4 rounded-lg mb-6 ${
          message.includes('success') 
            ? 'bg-green-900/20 border border-green-800 text-green-400' 
            : 'bg-red-900/20 border border-red-800 text-red-400'
        }`}>
          {message}
        </div>
      )}

      <div className="grid gap-6 max-w-4xl">
        {/* Video Settings */}
        <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">🎥 Video Settings</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-white font-medium">Video Uploads</label>
                <p className="text-gray-400 text-sm">Enable or disable video uploads for all users</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.video_upload_enabled === 'true'}
                  onChange={(e) => handleSettingChange('video_upload_enabled', e.target.checked.toString())}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-white font-medium">Max Video Size (MB)</label>
                <p className="text-gray-400 text-sm">Maximum allowed video file size</p>
                <input
                  type="number"
                  value={settings.max_video_size ? parseInt(settings.max_video_size) / (1024 * 1024) : 10}
                  onChange={(e) => handleSettingChange('max_video_size', (e.target.value * 1024 * 1024).toString())}
                  className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-600 mt-1"
                  min="1"
                  max="100"
                />
              </div>

              <div>
                <label className="text-white font-medium">Max Video Duration (seconds)</label>
                <p className="text-gray-400 text-sm">Maximum allowed video duration</p>
                <input
                  type="number"
                  value={settings.max_video_duration || 300}
                  onChange={(e) => handleSettingChange('max_video_duration', e.target.value)}
                  className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-600 mt-1"
                  min="10"
                  max="3600"
                />
              </div>
            </div>
          </div>
        </div>

        {/* User Settings */}
        <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">👥 User Settings</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-white font-medium">User Registration</label>
                <p className="text-gray-400 text-sm">Allow new users to register</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.user_registration_enabled === 'true'}
                  onChange={(e) => handleSettingChange('user_registration_enabled', e.target.checked.toString())}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>

            <div>
              <label className="text-white font-medium">Auto-Ban Threshold</label>
              <p className="text-gray-400 text-sm">Number of reports to automatically ban a user</p>
              <input
                type="number"
                value={settings.auto_ban_reports_threshold || 5}
                onChange={(e) => handleSettingChange('auto_ban_reports_threshold', e.target.value)}
                className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-600 mt-1"
                min="1"
                max="50"
              />
            </div>
          </div>
        </div>

        {/* System Settings */}
        <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">⚙️ System Settings</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-white font-medium">Chat System</label>
                <p className="text-gray-400 text-sm">Enable or disable chat functionality</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.chat_enabled === 'true'}
                  onChange={(e) => handleSettingChange('chat_enabled', e.target.checked.toString())}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-white font-medium">Maintenance Mode</label>
                <p className="text-gray-400 text-sm">Put the system in maintenance mode</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.maintenance_mode === 'true'}
                  onChange={(e) => handleSettingChange('maintenance_mode', e.target.checked.toString())}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center">
          <button
            onClick={handleReset}
            className="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            Reset to Default
          </button>
          
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SystemSettings;