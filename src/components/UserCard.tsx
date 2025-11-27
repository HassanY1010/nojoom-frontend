import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '../types';
import { userApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface UserCardProps {
  user: User;
  onFollowChange: (userId: number, isFollowing: boolean) => void;
}

const UserCard: React.FC<UserCardProps> = ({ user, onFollowChange }) => {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [isFollowing, setIsFollowing] = useState(user.is_following || false);
  const [isLoading, setIsLoading] = useState(false);
  const [followersCount, setFollowersCount] = useState(user.followers_count);

  // دالة مساعدة للحصول على رابط الصورة الكامل
  const getFullAvatarUrl = (avatarPath: string) => {
    if (!avatarPath) return '/default-avatar.png';
    if (avatarPath.startsWith('http')) return avatarPath;
    return `${import.meta.env.VITE_API_URL}${avatarPath}`;
  };

  // دالة للتعامل مع النقر على البروفايل
  const handleProfileClick = () => {
    if (!currentUser) {
      // إذا لم يكن المستخدم مسجل دخول، توجيهه لصفحة التسجيل
      navigate('/signup');
    } else {
      // إذا كان مسجل دخول، الانتقال للبروفايل
      navigate(`/profile/${user.username}`);
    }
  };

  const handleFollow = async () => {
    if (!currentUser) {
      alert('Please log in to follow users');
      return;
    }

    if (currentUser.id === user.id) {
      return; // لا يمكن متابعة نفسك
    }

    setIsLoading(true);
    try {
      if (isFollowing) {
        await userApi.unfollowUser(user.id);
        setIsFollowing(false);
        setFollowersCount(prev => Math.max(0, prev - 1));
        onFollowChange(user.id, false);
      } else {
        await userApi.followUser(user.id);
        setIsFollowing(true);
        setFollowersCount(prev => prev + 1);
        onFollowChange(user.id, true);
      }
    } catch (error: any) {
      console.error('Follow action failed:', error);
      if (error.response?.status === 401) {
        alert('Please log in to follow users');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <div onClick={handleProfileClick} className="cursor-pointer">
          <img
            src={getFullAvatarUrl(user.avatar)}
            alt={user.username}
            className="w-12 h-12 rounded-full object-cover border-2 border-gray-600 hover:border-red-500 transition-colors"
            onError={(e) => {
              e.currentTarget.src = '/default-avatar.png';
            }}
          />
        </div>

        <div className="flex-1 min-w-0">
          <div onClick={handleProfileClick} className="cursor-pointer">
            <h3 className="text-white font-semibold truncate hover:text-red-500 transition-colors">
              @{user.username}
            </h3>
          </div>

          {user.bio && (
            <p className="text-gray-400 text-sm truncate mt-1">
              {user.bio}
            </p>
          )}

          <div className="flex items-center space-x-4 mt-2 text-xs text-gray-400">
            <span>{followersCount} followers</span>
            <span>{user.following_count} following</span>
          </div>
        </div>
      </div>

      {currentUser && currentUser.id !== user.id && (
        <button
          onClick={handleFollow}
          disabled={isLoading}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${isFollowing
              ? 'bg-gray-700 text-white hover:bg-gray-600'
              : 'bg-red-500 text-white hover:bg-red-600'
            } disabled:opacity-50`}
        >
          {isLoading ? '...' : isFollowing ? 'Following' : 'Follow'}
        </button>
      )}
    </div>
  );
};

export default UserCard;