import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/AuthContext';
import TitleCard from './TitleCard';
import BracketConfiguration from './BracketConfiguration';
import PlayerPanel from './PlayerPanel';
import BracketVisualization from './BracketVisualization';
import styles from './manageTournament.module.css';

const ManageTournament = () => {
  const router = useRouter();
  const { user } = useAuth();
  const { eventId } = router.query;
  
  const [eventData, setEventData] = useState(null);
  const [bracketFormat, setBracketFormat] = useState('single-elimination');

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
      <div className={styles.mainContent}>
        <TitleCard title="Tournament Management" eventData={eventData} />
        <div className={styles.contentLayout}>
          <div className={styles.leftColumn}>
            <BracketConfiguration 
              format={bracketFormat} 
              onFormatChange={setBracketFormat} 
            />
            <PlayerPanel eventId={eventId} />
          </div>
          <div className={styles.rightColumn}>
            <BracketVisualization format={bracketFormat} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManageTournament;
