import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/AuthContext';
import TitleCard from './TitleCard';
import TournamentSidebar from './TournamentSidebar';
import BracketVisualization from './BracketVisualization';
import TournamentPanel from './TournamentPanel';
import UpNextCard from './UpNextCard';
import styles from './manageTournament.module.css';

const ManageTournament = () => {
  const router = useRouter();
  const { user } = useAuth();
  const { eventId } = router.query;
  
  const [eventData, setEventData] = useState(null);
  const [activeSection, setActiveSection] = useState('bracket');

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
    }
  }, [eventId, user]);

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
                  <TournamentPanel eventData={eventData} />
                  <UpNextCard tournamentData={eventData} />
                </div>
                <BracketVisualization eventData={eventData} />
              </div>
            )}
            {activeSection === 'standings' && (
              <div className={styles.placeholder}>
                <h3>Standings</h3>
                <p>Tournament standings will be displayed here.</p>
              </div>
            )}
            {activeSection === 'participants' && (
              <div className={styles.placeholder}>
                <h3>Participants</h3>
                <p>Participant management will be displayed here.</p>
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
 