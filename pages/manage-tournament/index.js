import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/AuthContext';
import { generateBracketData as generateSingleEliminationBracket } from '../../lib/singleElimination';
import { generateBracketData as generateDoubleEliminationBracket } from '../../lib/doubleElimination';
import { generateBracketData as generateRoundRobinBracket } from '../../lib/roundRobin';
import { generateBracketData as generateSwissBracket } from '../../lib/swiss';
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


  const handleTournamentLiveChange = async (isLive) => {
    setIsTournamentLive(isLive);
    
    // Update tournament status based on configuration panel state
    if (!isLive && tournamentData) {
      // Configuration panel is open - set status to seeding
      await updateTournamentStatus('seeding');
    } else if (isLive && tournamentData) {
      // Configuration panel is closed - set status to active
      await updateTournamentStatus('active');
    }
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
    if (!eventId || !tournamentData) return;
    
    try {
      // Generate new bracket data based on the new format
      let newBracketData = null;
      
      if (participants.length >= 2) {
        try {
          switch (newFormat) {
            case 'single_elimination':
              newBracketData = generateSingleEliminationBracket(newFormat, participants);
              break;
            case 'double_elimination':
              newBracketData = generateDoubleEliminationBracket(newFormat, participants);
              break;
            case 'round_robin':
              newBracketData = generateRoundRobinBracket(newFormat, participants);
              break;
            case 'swiss':
              newBracketData = generateSwissBracket(newFormat, participants);
              break;
            default:
              console.error('Unsupported tournament format:', newFormat);
              return;
          }
        } catch (bracketError) {
          console.error('Error generating bracket data:', bracketError);
          // Continue with format update even if bracket generation fails
        }
      }

      // Update tournament type and bracket data
      const updateData = { tournament_type: newFormat };
      if (newBracketData) {
        updateData.bracket_data = newBracketData;
      }

      const { error } = await supabase
        .from('tournaments')
        .update(updateData)
        .eq('event_id', eventId);

      if (error) throw error;
      
      // Refresh tournament data to get updated format and bracket
      fetchTournamentData();
      
      // Trigger refresh of bracket visualization
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      console.error('Error updating tournament format:', err);
    }
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
 