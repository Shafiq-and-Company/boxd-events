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
  const [tournamentData, setTournamentData] = useState(null);
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

  const fetchTournamentData = async () => {
    if (!eventId) return;
    
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .eq('event_id', eventId)
        .single();

      if (error) throw error;
      setTournamentData(data);
    } catch (err) {
      console.error('Error fetching tournament data:', err);
    }
  };

  const updateTournamentStatus = async (status) => {
    if (!eventId || !tournamentData) return;
    
    try {
      const { error } = await supabase
        .from('tournaments')
        .update({ status })
        .eq('event_id', eventId);

      if (error) throw error;
      
      // Refresh tournament data to get updated status
      fetchTournamentData();
    } catch (err) {
      console.error('Error updating tournament status:', err);
    }
  };

  useEffect(() => {
    if (eventId && user) {
      fetchEventData();
      fetchTournamentData();
      fetchParticipants();
    }
  }, [eventId, user]);

  // Update tournament status when configuration panel state changes
  useEffect(() => {
    if (tournamentData && !isTournamentLive) {
      // Configuration panel is open - ensure status is seeding
      if (tournamentData.status !== 'seeding') {
        updateTournamentStatus('seeding');
      }
    }
  }, [isTournamentLive, tournamentData, updateTournamentStatus]);


  const resetTournamentData = async () => {
    console.log('resetTournamentData - functionality removed, awaiting brackets-manager integration');
    // TODO: Implement with brackets-manager.js
  };

  const handleTournamentLiveChange = async (isLive) => {
    setIsTournamentLive(isLive);
    console.log('Tournament live state changed:', isLive);
    // TODO: Implement tournament live logic with brackets-manager.js
  };

  const handleTournamentUpdate = () => {
    setRefreshTrigger(prev => prev + 1);
    fetchTournamentData();
  };

  const handleMatchUpdate = () => {
    setRefreshTrigger(prev => prev + 1);
    fetchTournamentData();
  };

  const handleSeedingUpdate = () => {
    setRefreshTrigger(prev => prev + 1);
    fetchTournamentData();
  };

  const handleFormatChange = async (newFormat) => {
    console.log('Format change requested:', newFormat);
    // TODO: Implement with brackets-manager.js
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
      <TitlePanel title="Tournament Management" eventData={eventData} tournamentData={tournamentData} />
      <div style={{ 
        paddingTop: '32px',
        padding: '1rem',
        margin: '0 auto',
        maxWidth: '100vw',
        boxSizing: 'border-box',
        minHeight: 'calc(100vh - 72px)'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: isTournamentLive ? '60px 1fr 20%' : '20% 1fr 60px',
          height: 'calc(100vh - 72px - 2rem)',
          gap: '1rem',
          maxWidth: '100%',
          transition: 'grid-template-columns 0.3s ease-in-out'
        }}>
          {/* Left Column - Configuration */}
          <ConfigurationPanel 
            eventData={eventData}
            tournamentData={tournamentData}
            participants={participants}
            onTournamentUpdate={handleTournamentUpdate}
            onSeedingUpdate={handleSeedingUpdate}
            onTournamentLiveChange={handleTournamentLiveChange}
            onFormatChange={handleFormatChange}
          />

          {/* Center Column - Bracket Visualization */}
          <VisualizationPanel 
            eventData={eventData}
            participants={participants}
            refreshTrigger={refreshTrigger}
          />

          {/* Right Column - Scorekeeping */}
          <ScorekeepingPanel 
            eventData={eventData}
            participants={participants}
            onMatchUpdate={handleMatchUpdate}
            isCollapsed={!isTournamentLive}
          />
        </div>
      </div>
    </div>
  );
};

export default ManageTournament;
 