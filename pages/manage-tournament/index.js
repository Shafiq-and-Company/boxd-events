import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/AuthContext';
import TitlePanel from './TitlePanel';
import ConfigurationPanel from './ConfigurationPanel';
import VisualizationPanel from './VisualizationPanel';
import ScorekeepingPanel from './ScorekeepingPanel';

const ManageTournament = () => {
  const router = useRouter();
  const { user } = useAuth();
  const { eventId } = router.query;
  
  const [eventData, setEventData] = useState(null);
  const [activeSection, setActiveSection] = useState('bracket');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [participants, setParticipants] = useState([]);
  const [isTournamentLive, setIsTournamentLive] = useState(false);

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

  const handleTournamentLiveChange = (isLive) => {
    setIsTournamentLive(isLive);
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
    <div>
      <TitlePanel title="Tournament Management" eventData={eventData} />
        <div style={{ 
          paddingTop: '30px',
          padding: '1rem',
          margin: '0 auto',
          maxWidth: 'calc(100vw - 4rem)',
          boxSizing: 'border-box'
        }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: isTournamentLive ? '60px 1fr 20%' : '20% 1fr',
          height: 'calc(100vh - 72px - 2rem)',
          gap: '1rem',
          maxWidth: '100%'
        }}>
        {/* Left Column - Configuration */}
        <ConfigurationPanel 
          eventData={eventData}
          participants={participants}
          onTournamentUpdate={handleTournamentUpdate}
          onSeedingUpdate={handleSeedingUpdate}
          onTournamentLiveChange={handleTournamentLiveChange}
        />

        {/* Center Column - Bracket Visualization */}
        <VisualizationPanel 
          eventData={eventData}
          participants={participants}
          refreshTrigger={refreshTrigger}
        />

        {/* Right Column - Scorekeeping */}
        {isTournamentLive && (
          <ScorekeepingPanel 
            eventData={eventData}
            participants={participants}
            onMatchUpdate={handleMatchUpdate}
          />
        )}
        </div>
      </div>
    </div>
  );
};

export default ManageTournament;
 