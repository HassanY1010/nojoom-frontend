import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Trophy, Clock, Users, Award } from 'lucide-react';
import { getActiveChallenges, getPastChallenges } from '../services/challengeService';
import ChallengeCard from '../components/ChallengeCard';
import './Challenges.css';

interface Challenge {
    id: number;
    title: string;
    title_ar: string;
    description: string;
    description_ar: string;
    type: '10_second_video' | 'best_editing' | 'best_comment';
    start_date: string;
    end_date: string;
    status: string;
    entries_count: number;
    winner_username?: string;
    winner_avatar?: string;
    user_submitted?: boolean;
}

const Challenges: React.FC = () => {
    const { t, i18n } = useTranslation();
    const [activeChallenges, setActiveChallenges] = useState<Challenge[]>([]);
    const [pastChallenges, setPastChallenges] = useState<Challenge[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'active' | 'past'>('active');

    useEffect(() => {
        loadChallenges();
    }, []);

    const loadChallenges = async () => {
        try {
            setLoading(true);
            const [activeRes, pastRes] = await Promise.all([
                getActiveChallenges(),
                getPastChallenges(10)
            ]);

            if (activeRes.success) {
                setActiveChallenges(activeRes.data);
            }

            if (pastRes.success) {
                setPastChallenges(pastRes.data);
            }
        } catch (error) {
            console.error('Error loading challenges:', error);
        } finally {
            setLoading(false);
        }
    };

    const getChallengeIcon = (type: string) => {
        switch (type) {
            case '10_second_video':
                return <Clock className="challenge-type-icon" />;
            case 'best_editing':
                return <Award className="challenge-type-icon" />;
            case 'best_comment':
                return <Users className="challenge-type-icon" />;
            default:
                return <Trophy className="challenge-type-icon" />;
        }
    };

    if (loading) {
        return (
            <div className="challenges-page">
                <div className="challenges-loading">
                    <div className="spinner"></div>
                    <p>{t('searchPage.loading')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="challenges-page">
            {/* Header */}
            <div className="challenges-header">
                <div className="challenges-header-content">
                    <Trophy className="challenges-header-icon" />
                    <div>
                        <h1>{t('challenges.title')}</h1>
                        <p className="challenges-subtitle">
                            {i18n.language === 'ar'
                                ? 'شارك في التحديات الأسبوعية واربح أوسمة وجوائز مميزة!'
                                : 'Participate in weekly challenges and win exclusive badges and rewards!'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="challenges-tabs">
                <button
                    className={`challenges-tab ${activeTab === 'active' ? 'active' : ''}`}
                    onClick={() => setActiveTab('active')}
                >
                    <Clock size={18} />
                    {t('challenges.activeChallenges')}
                    {activeChallenges.length > 0 && (
                        <span className="tab-badge">{activeChallenges.length}</span>
                    )}
                </button>
                <button
                    className={`challenges-tab ${activeTab === 'past' ? 'active' : ''}`}
                    onClick={() => setActiveTab('past')}
                >
                    <Trophy size={18} />
                    {t('challenges.pastWinners')}
                </button>
            </div>

            {/* Content */}
            <div className="challenges-content">
                {activeTab === 'active' ? (
                    <div className="challenges-grid">
                        {activeChallenges.length > 0 ? (
                            activeChallenges.map((challenge) => (
                                <ChallengeCard
                                    key={challenge.id}
                                    challenge={challenge}
                                    onSubmitSuccess={loadChallenges}
                                />
                            ))
                        ) : (
                            <div className="challenges-empty">
                                <Clock size={64} className="empty-icon" />
                                <h3>{t('challenges.noActiveChallenges')}</h3>
                                <p>
                                    {i18n.language === 'ar'
                                        ? 'تابعنا لمعرفة التحديات الجديدة!'
                                        : 'Stay tuned for new challenges!'}
                                </p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="past-winners-section">
                        {pastChallenges.length > 0 ? (
                            <div className="winners-grid">
                                {pastChallenges.map((challenge) => (
                                    <div key={challenge.id} className="winner-card">
                                        <div className="winner-card-header">
                                            <div className="winner-challenge-type">
                                                {getChallengeIcon(challenge.type)}
                                                <span>
                                                    {i18n.language === 'ar' ? challenge.title_ar : challenge.title}
                                                </span>
                                            </div>
                                            <Trophy className="winner-trophy-icon" />
                                        </div>

                                        {challenge.winner_username && (
                                            <div className="winner-info">
                                                <img
                                                    src={challenge.winner_avatar || '/default-avatar.png'}
                                                    alt={challenge.winner_username}
                                                    className="winner-avatar"
                                                />
                                                <div className="winner-details">
                                                    <span className="winner-label">{t('challenges.winner')}</span>
                                                    <span className="winner-username">@{challenge.winner_username}</span>
                                                </div>
                                            </div>
                                        )}

                                        <div className="winner-stats">
                                            <div className="winner-stat">
                                                <Users size={16} />
                                                <span>{challenge.entries_count} {t('challenges.entries')}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="challenges-empty">
                                <Trophy size={64} className="empty-icon" />
                                <h3>{t('challenges.noPastWinners')}</h3>
                                <p>
                                    {i18n.language === 'ar'
                                        ? 'كن أول فائز في التحديات!'
                                        : 'Be the first to win a challenge!'}
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Challenges;
