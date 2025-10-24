import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/AuthContext';
import TitleCard from './TitleCard';
import styles from './indexTournament.module.css';

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
      <div className={styles.mainContent}>
        <TitleCard title="Tournament Management" eventData={eventData} />
        <div className={styles.contentLayout}>
          <div className={styles.sectionContent}>
            <div className={styles.contentPlaceholder}>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManageTournament;
 