import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/AuthContext';
import TitleCard from './TitleCard';
import TournamentSidebar from './TournamentSidebar';
import BracketVisualization from './BracketVisualization';
import TournamentPanel from './TournamentPanel';
import UpNextCard from './UpNextCard';
import SeedingPanel from './SeedingPanel';
import Participants from './Participants';
import styles from './manageTournament.module.css';

const ManageTournament = () => {
  const router = useRouter();
  const { user } = useAuth();
  const { eventId } = router.query;
  
  const [eventData, setEventData] = useState(null);
  const [activeSection, setActiveSection] = useState('bracket');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [participants, setParticipants] = useState([]);

  const fetchEventData = async () => {
    if (!eventId || !user) return;
    
    try {
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
    }
  };

  useEffect(() => {
    if (eventId && user) {
      fetchEventData();
      fetchParticipants();
    }
  }, [eventId, user]);

  const handleTournamentUpdate = () => {
    // Trigger refresh of bracket visualization
    setRefreshTrigger(prev => prev + 1);
  };

  const handleMatchUpdate = () => {
    // Trigger refresh of both bracket visualization and upcoming matches
    setRefreshTrigger(prev => prev + 1);
  };

  const handleSeedingUpdate = (action, method) => {
    // Handle seeding actions
    console.log('Seeding action:', action, method);
    // Trigger refresh of bracket visualization
    setRefreshTrigger(prev => prev + 1);
  };

  const fetchParticipants = async () => {
    if (!eventId) return;
    
    try {
      const { data, error } = await supabase
        .from('rsvps')
        .select(`
          user_id,
          created_at,
          users:user_id (
            username,
            first_name,
            last_name
          )
        `)
        .eq('event_id', eventId)
        .eq('status', 'going')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setParticipants(data || []);
    } catch (err) {
      console.error('Error fetching participants:', err);
      setParticipants([]);
    }
  };

  return (
    <div className={styles.dashboard}>
      <TournamentSidebar 
        activeSection={activeSection} 
        onSectionChange={setActiveSection} 
      />
      <div className={styles.mainContent}>
        <TitleCard title="Tournament Management" eventData={eventData} />
        <div className={styles.contentLayout}>
          <div className={styles.sectionContent}>
            {activeSection === 'bracket' && (
              <div className={styles.bracketLayout}>
                <div className={styles.leftPanel}>
                  <TournamentPanel eventData={eventData} onSettingsUpdate={handleTournamentUpdate} />
                  <UpNextCard eventData={eventData} refreshTrigger={refreshTrigger} onMatchUpdate={handleMatchUpdate} />
                </div>
                <BracketVisualization eventData={eventData} refreshTrigger={refreshTrigger} />
              </div>
            )}
            {activeSection === 'standings' && (
              <div className={styles.placeholder}>
                <h3>Standings</h3>
                <p>Tournament standings will be displayed here.</p>
              </div>
            )}
            {activeSection === 'participants' && (
              <div className={styles.participantsLayout}>
                <Participants eventId={eventId} />
                <SeedingPanel eventData={eventData} participants={participants} onSeedingUpdate={handleSeedingUpdate} />
              </div>
            )}
            {activeSection === 'details' && (
              <div className={styles.placeholder}>
                <h3>Tournament Details</h3>
                <p>Tournament details and information will be displayed here.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManageTournament;
 