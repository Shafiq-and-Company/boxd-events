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
import SingleElimBracket from './SingleElimBracket';
import Participants from './Participants';
import TournamentFormat from './TournamentFormat';
import TournamentConfiguration from './TournamentConfiguration';
import styles from './manageTournament.module.css';


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
            <Participants 
              participants={participants} 
              loadingParticipants={loadingParticipants} 
            />
          </div>
        )}
        
        {activeTab === 'settings' && (
          <div className={styles.bracketsSection}>
            <TitleCard title="Tournament Settings" eventData={eventData} />
            <div className={styles.settingsContainer}>
              <TournamentFormat />
            </div>
            <div className={styles.settingsContainer}>
              <TournamentConfiguration />
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
              <SingleElimBracket participants={participants} />
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
