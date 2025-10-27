import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/AuthContext';
import { generateSingleEliminationBracket, updateTournamentMatches as updateSingleEliminationMatches } from '../../lib/singleElimination';
import { generateDoubleEliminationBracket, updateTournamentMatches as updateDoubleEliminationMatches } from '../../lib/doubleElimination';
import { generateRoundRobinBracket, updateTournamentMatches as updateRoundRobinMatches } from '../../lib/roundRobin';
import { generateSwissBracket, updateTournamentMatches as updateSwissMatches } from '../../lib/swiss';
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
    if (!eventId || !tournamentData) return;
    
    try {
      // Prepare participants data for bracket generation
      const formattedParticipants = participants.map(p => ({
        id: p.user_id,
        name: p.users?.username || 'Unknown',
        username: p.users?.username,
        first_name: p.users?.first_name,
        last_name: p.users?.last_name
      }));

      // Generate new bracket data from participants
      let newBracketData = null;
      
      if (formattedParticipants.length >= 2) {
        try {
          switch (tournamentData.tournament_type) {
            case 'single_elimination':
              newBracketData = generateSingleEliminationBracket(formattedParticipants);
              break;
            case 'double_elimination':
              newBracketData = generateDoubleEliminationBracket(formattedParticipants);
              break;
            case 'round_robin':
              newBracketData = generateRoundRobinBracket(formattedParticipants);
              break;
            case 'swiss':
              newBracketData = generateSwissBracket(formattedParticipants);
              break;
            default:
              console.error('Unsupported tournament format:', tournamentData.tournament_type);
          }
        } catch (bracketError) {
          console.error('Error generating bracket data:', bracketError);
        }
      }

      // Update tournament data with new bracket
      const resetData = {
        bracket_data: newBracketData,
        updated_at: new Date().toISOString()
      };

      const { error: tournamentError } = await supabase
        .from('tournaments')
        .update(resetData)
        .eq('event_id', eventId);

      if (tournamentError) throw tournamentError;

      // Delete all tournament matches for this tournament
      const { error: matchesError } = await supabase
        .from('tournament_matches')
        .delete()
        .eq('tournament_id', tournamentData.id);

      if (matchesError) throw matchesError;

      // Insert new tournament_matches rows
      if (newBracketData && tournamentData.id) {
        try {
          switch (tournamentData.tournament_type) {
            case 'single_elimination':
              await updateSingleEliminationMatches(tournamentData.id, newBracketData, supabase);
              break;
            case 'double_elimination':
              await updateDoubleEliminationMatches(tournamentData.id, newBracketData, supabase);
              break;
            case 'round_robin':
              await updateRoundRobinMatches(tournamentData.id, newBracketData, supabase);
              break;
            case 'swiss':
              await updateSwissMatches(tournamentData.id, newBracketData, supabase);
              break;
          }
        } catch (updateError) {
          console.error('Error inserting tournament matches:', updateError);
        }
      }

      // Refresh tournament data to reflect changes
      await fetchTournamentData();
      
      // Trigger refresh of bracket visualization
      setRefreshTrigger(prev => prev + 1);
      
      console.log('Tournament bracket generated and matches reset successfully');
    } catch (err) {
      console.error('Error resetting tournament data:', err);
    }
  };

  const handleTournamentLiveChange = async (isLive) => {
    setIsTournamentLive(isLive);
    
    // Update tournament status based on configuration panel state
    if (!isLive && tournamentData) {
      // Configuration panel is open - set status to seeding
      await updateTournamentStatus('seeding');
    } else if (isLive && tournamentData) {
      // Configuration panel is closed - reset tournament data and set status to active
      await resetTournamentData();
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
      // Prepare participants data for bracket generation
      const formattedParticipants = participants.map(p => ({
        id: p.user_id,
        name: p.users?.username || 'Unknown',
        username: p.users?.username,
        first_name: p.users?.first_name,
        last_name: p.users?.last_name
      }));

      // Generate new bracket data based on the new format
      let newBracketData = null;
      
      if (formattedParticipants.length >= 2) {
        try {
          switch (newFormat) {
            case 'single_elimination':
              newBracketData = generateSingleEliminationBracket(formattedParticipants);
              break;
            case 'double_elimination':
              newBracketData = generateDoubleEliminationBracket(formattedParticipants);
              break;
            case 'round_robin':
              newBracketData = generateRoundRobinBracket(formattedParticipants);
              break;
            case 'swiss':
              newBracketData = generateSwissBracket(formattedParticipants);
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
 