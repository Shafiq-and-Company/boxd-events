import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/AuthContext';
import SideBar from './SideBar';
import TitleCard from './TitleCard';
import TournamentStats from './TournamentStats';
import CompetitionRules from './CompetitionRules';
import PrizeDistribution from './PrizeDistribution';
import EventTimeline from './EventTimeline';
import styles from './manageTournament.module.css';

// Single Elimination Bracket Component
const SingleEliminationBracket = ({ participants }) => {
  const generateBracket = (participants) => {
    const numParticipants = participants.length;
    const rounds = Math.ceil(Math.log2(numParticipants));
    const bracket = [];
    
    // Create first round with all participants paired up
    const firstRound = [];
    for (let i = 0; i < participants.length; i += 2) {
      const match = {
        id: `r1-${i/2}`,
        participants: [participants[i], participants[i + 1] || null],
        winner: null,
        round: 1,
        position: i/2
      };
      firstRound.push(match);
    }
    bracket.push(firstRound);
    
    // Create subsequent rounds
    let currentRoundSize = Math.ceil(numParticipants / 2);
    for (let round = 2; round <= rounds; round++) {
      const roundMatches = [];
      for (let i = 0; i < currentRoundSize; i++) {
        roundMatches.push({
          id: `r${round}-${i}`,
          participants: [null, null],
          winner: null,
          round: round,
          position: i
        });
      }
      bracket.push(roundMatches);
      currentRoundSize = Math.ceil(currentRoundSize / 2);
    }
    
    return bracket;
  };

  const bracket = generateBracket(participants);

  return (
    <div className={styles.bracket}>
      {bracket.map((round, roundIndex) => (
        <div key={roundIndex} className={styles.bracketRound}>
          <div className={styles.roundLabel}>Round {roundIndex + 1}</div>
          <div className={styles.roundMatches}>
            {round.map((match, matchIndex) => (
              <div key={match.id} className={styles.match}>
                <div className={styles.matchParticipants}>
                  {match.participants.map((participant, pIndex) => (
                    <div key={pIndex} className={styles.matchParticipant}>
                      {participant ? (
                        <div className={styles.participantName}>
                          {participant.users?.username || 
                           participant.users?.first_name || 
                           'Unknown'}
                        </div>
                      ) : (
                        <div className={styles.placeholder}>TBD</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

const ManageTournament = () => {
  const router = useRouter();
  const { user } = useAuth();
  const { eventId } = router.query;
  
  // State
  const [activeTab, setActiveTab] = useState('participants');
  const [participants, setParticipants] = useState([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [eventData, setEventData] = useState(null);
  const [loadingEvent, setLoadingEvent] = useState(false);

  // Data fetching functions
  const fetchEventData = async () => {
    if (!eventId || !user) return;
    
    try {
      setLoadingEvent(true);
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .eq('host_id', user.id)
        .single();

      if (error) throw error;
      setEventData(data);
    } catch (err) {
      console.error('Error fetching event:', err);
    } finally {
      setLoadingEvent(false);
    }
  };

  const fetchParticipants = async () => {
    if (!eventId) return;
    
    try {
      setLoadingParticipants(true);
      const { data, error } = await supabase
        .from('rsvps')
        .select(`
          user_id,
          created_at,
          status,
          users:user_id (
            username,
            first_name,
            email
          )
        `)
        .eq('event_id', eventId)
        .eq('status', 'going')
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      // Add 10 hardcoded demo participants
      const demoParticipants = [
        {
          user_id: 'demo-1',
          created_at: new Date().toISOString(),
          status: 'going',
          users: {
            username: 'ProGamer99',
            first_name: 'Alex',
            email: 'alex@example.com'
          }
        },
        {
          user_id: 'demo-2',
          created_at: new Date().toISOString(),
          status: 'going',
          users: {
            username: 'TournamentKing',
            first_name: 'Marcus',
            email: 'marcus@example.com'
          }
        },
        {
          user_id: 'demo-3',
          created_at: new Date().toISOString(),
          status: 'going',
          users: {
            username: 'GameMaster',
            first_name: 'Sarah',
            email: 'sarah@example.com'
          }
        },
        {
          user_id: 'demo-4',
          created_at: new Date().toISOString(),
          status: 'going',
          users: {
            username: 'ElitePlayer',
            first_name: 'Jordan',
            email: 'jordan@example.com'
          }
        },
        {
          user_id: 'demo-5',
          created_at: new Date().toISOString(),
          status: 'going',
          users: {
            username: 'Champion2024',
            first_name: 'Taylor',
            email: 'taylor@example.com'
          }
        },
        {
          user_id: 'demo-6',
          created_at: new Date().toISOString(),
          status: 'going',
          users: {
            username: 'SpeedRunner',
            first_name: 'Casey',
            email: 'casey@example.com'
          }
        },
        {
          user_id: 'demo-7',
          created_at: new Date().toISOString(),
          status: 'going',
          users: {
            username: 'GamingLegend',
            first_name: 'Riley',
            email: 'riley@example.com'
          }
        },
        {
          user_id: 'demo-8',
          created_at: new Date().toISOString(),
          status: 'going',
          users: {
            username: 'VictorySeeker',
            first_name: 'Morgan',
            email: 'morgan@example.com'
          }
        },
        {
          user_id: 'demo-9',
          created_at: new Date().toISOString(),
          status: 'going',
          users: {
            username: 'TournamentPro',
            first_name: 'Avery',
            email: 'avery@example.com'
          }
        },
        {
          user_id: 'demo-10',
          created_at: new Date().toISOString(),
          status: 'going',
          users: {
            username: 'GameChanger',
            first_name: 'Quinn',
            email: 'quinn@example.com'
          }
        }
      ];
      
      setParticipants([...(data || []), ...demoParticipants]);
    } catch (err) {
      console.error('Error fetching participants:', err);
      setParticipants([]);
    } finally {
      setLoadingParticipants(false);
    }
  };

  // Effects
  useEffect(() => {
    if (eventId && user) {
      fetchEventData();
      fetchParticipants();
    }
  }, [eventId, user]);

  // Tab change handler
  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };
  
  return (
    <div className={styles.dashboard}>
      <SideBar activeTab={activeTab} onTabChange={handleTabChange} />
      
      {/* Main Content Area */}
      <div className={styles.mainContent}>
        {activeTab === 'participants' && (
          <div className={styles.bracketsSection}>
            <TitleCard title="Tournament Participants" eventData={eventData} />
            
            {loadingParticipants ? (
              <div className={styles.loadingState}>
                <div className={styles.loadingSpinner}></div>
                <p>Loading participants...</p>
              </div>
            ) : participants.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                </div>
                <h3>No participants yet</h3>
                <p>Participants will appear here once they RSVP to your event.</p>
              </div>
            ) : (
              <div className={styles.participantsList}>
                <div className={styles.participantsHeader}>
                  <span className={styles.participantCount}>
                    {participants.length} participant{participants.length !== 1 ? 's' : ''}
                  </span>
                </div>
                {participants.map((participant, index) => (
                  <div key={participant.user_id} className={styles.participantItem}>
                    <div className={styles.participantNumber}>#{index + 1}</div>
                    <div className={styles.participantAvatar}>
                      <div className={styles.avatarInitial}>
                        {(participant.users?.username?.charAt(0) || 
                          participant.users?.first_name?.charAt(0) || 
                          'U').toUpperCase()}
                      </div>
                    </div>
                    <div className={styles.participantInfo}>
                      <div className={styles.participantName}>
                        {participant.users?.username || 
                         participant.users?.first_name || 
                         'Unknown User'}
                      </div>
                      <div className={styles.participantEmail}>
                        {participant.users?.email}
                      </div>
                    </div>
                    <div className={styles.participantStatus}>
                      <span className={styles.statusBadge}>
                        {participant.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'settings' && (
          <div className={styles.bracketsSection}>
            <TitleCard title="Tournament Settings" eventData={eventData} />
            
            <div className={styles.settingsGrid}>
              {/* Tournament Format */}
              <div className={styles.settingCard}>
                <div className={styles.settingHeader}>
                  <h3 className={styles.settingTitle}>Tournament Format</h3>
                  <span className={styles.settingBadge}>Single Elimination</span>
                </div>
                <div className={styles.settingOptions}>
                  <div className={styles.optionItem}>
                    <input type="radio" id="single-elim" name="format" defaultChecked />
                    <label htmlFor="single-elim">Single Elimination</label>
                  </div>
                  <div className={styles.optionItem}>
                    <input type="radio" id="double-elim" name="format" />
                    <label htmlFor="double-elim">Double Elimination</label>
                  </div>
                  <div className={styles.optionItem}>
                    <input type="radio" id="round-robin" name="format" />
                    <label htmlFor="round-robin">Round Robin</label>
                  </div>
                </div>
              </div>

              {/* Tournament Configuration */}
              <div className={styles.settingCard}>
                <div className={styles.settingHeader}>
                  <h3 className={styles.settingTitle}>Tournament Configuration</h3>
                </div>
                <div className={styles.configGrid}>
                  <div className={styles.configItem}>
                    <label className={styles.configLabel}>Max Participants</label>
                    <input type="number" className={styles.configInput} defaultValue="32" min="8" max="64" />
                  </div>
                  <div className={styles.configItem}>
                    <label className={styles.configLabel}>Match Duration (minutes)</label>
                    <input type="number" className={styles.configInput} defaultValue="15" min="5" max="60" />
                  </div>
                  <div className={styles.configItem}>
                    <label className={styles.configLabel}>Break Duration (minutes)</label>
                    <input type="number" className={styles.configInput} defaultValue="5" min="2" max="15" />
                  </div>
                  <div className={styles.configItem}>
                    <label className={styles.configLabel}>Streaming Enabled</label>
                    <div className={styles.toggleSwitch}>
                      <input type="checkbox" id="streaming" defaultChecked />
                      <label htmlFor="streaming" className={styles.toggleLabel}></label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className={styles.actionButtons}>
                <button className={styles.saveButton}>Save Settings</button>
                <button className={styles.publishButton}>Publish Tournament</button>
                <button className={styles.previewButton}>Preview Bracket</button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'prizes' && (
          <div className={styles.bracketsSection}>
            <TitleCard title="Prize Pool" eventData={eventData} />
            <PrizeDistribution />
          </div>
        )}

        {activeTab === 'schedule' && (
          <div className={styles.bracketsSection}>
            <TitleCard title="Tournament Schedule" eventData={eventData} />
            <EventTimeline />
          </div>
        )}

        {activeTab === 'rules' && (
          <div className={styles.bracketsSection}>
            <TitleCard title="Tournament Rules" eventData={eventData} />
            <CompetitionRules />
          </div>
        )}

        {activeTab === 'brackets' && (
          <div className={styles.bracketsSection}>
            <TitleCard title="Tournament Brackets" eventData={eventData} />
            
            {participants.length > 0 ? (
              <div className={styles.bracketContainer}>
                <SingleEliminationBracket participants={participants} />
              </div>
            ) : (
              <div className={styles.bracketPreview}>
                <div className={styles.bracketPlaceholder}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M8 2v4"/>
                    <path d="M16 2v4"/>
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <path d="M3 10h18"/>
                  </svg>
                  <p>Add participants to generate bracket</p>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className={styles.bracketsSection}>
            <TitleCard title="Tournament Analytics" eventData={eventData} />
            <TournamentStats participants={participants} eventData={eventData} />
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageTournament;
