import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import styles from './PlayerPanel.module.css';

const PlayerPanel = ({ eventId }) => {
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);


  const fetchParticipants = async () => {
    if (!eventId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('rsvps')
        .select(`
          user_id,
          created_at,
          status,
          payment_status,
          users:user_id (
            username,
            first_name,
            last_name
          )
        `)
        .eq('event_id', eventId)
        .eq('status', 'going')
        .order('created_at', { ascending: true });

      if (error) {
        setError('Failed to fetch participants');
        return;
      }

      // Transform RSVP data to participant format
      const participantsData = data.map((rsvp, index) => ({
        id: rsvp.user_id,
        name: rsvp.users?.first_name && rsvp.users?.last_name 
          ? `${rsvp.users.first_name} ${rsvp.users.last_name}`
          : rsvp.users?.username || 'Unknown Player',
        rank: index + 1, // Rank based on RSVP order
        rsvpDate: rsvp.created_at
      }));

      setParticipants(participantsData);
    } catch (err) {
      setError('Failed to fetch participants');
      console.error('Error fetching participants:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleParticipantAction = (participantId, action) => {
    console.log(`${action} participant ${participantId}`);
  };

  useEffect(() => {
    if (eventId) {
      fetchParticipants();
    }
  }, [eventId]);

  return (
    <div className={styles.panelCard}>
      <div className={styles.panelHeader}>
        <h3 className={styles.panelTitle}>Player Panel</h3>
      </div>
      
      <div className={styles.panelContent}>
        {/* Participants List Section */}
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>Participants ({participants.length})</h4>
          
          {loading && (
            <div className={styles.loadingMessage}>Loading participants...</div>
          )}
          
          {error && (
            <div className={styles.errorMessage}>{error}</div>
          )}
          
          {!loading && !error && participants.length === 0 && (
            <div className={styles.emptyMessage}>No participants yet</div>
          )}
          
          {!loading && !error && participants.length > 0 && (
            <div className={styles.participantsList}>
              {participants.map((participant) => (
                <div key={participant.id} className={styles.participantItem}>
                  <div className={styles.participantInfo}>
                    <div className={styles.participantName}>
                      <span className={styles.rank}>#{participant.rank}</span>
                      <span className={styles.name}>{participant.name}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlayerPanel;
