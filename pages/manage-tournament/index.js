import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import TitlePanel from './TitlePanel';
import ConfigurationPanel from './ConfigurationPanel';
import VisualizationPanel from './VisualizationPanel';
import ScorekeepingPanel from './ScorekeepingPanel';

const ManageTournament = () => {
  const router = useRouter();
  const { eventId } = router.query;
  
  const [eventData, setEventData] = useState(null);
  const [tournamentData, setTournamentData] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [participants, setParticipants] = useState([]);
  const [isTournamentLive, setIsTournamentLive] = useState(false);

  // TODO: Fetch event data with brackets-manager.js integration
  const fetchEventData = async () => {
    if (!eventId) return;
    console.log('Fetching event data for:', eventId);
    // Placeholder for future implementation
    setEventData({ id: eventId, title: 'Sample Tournament', game_title: 'Sample Game' });
  };

  const fetchTournamentData = async () => {
    if (!eventId) return;
    console.log('Fetching tournament data for:', eventId);
    // Placeholder for future implementation
    setTournamentData({ 
      id: 'placeholder-id',
      tournament_type: 'single_elimination',
      status: 'seeding'
    });
  };

  useEffect(() => {
    if (eventId) {
      fetchEventData();
      fetchTournamentData();
      fetchParticipants();
    }
  }, [eventId]);


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
    
    console.log('Fetching participants for event:', eventId);
    // Placeholder for future implementation
    setParticipants([
      {
        user_id: '1',
        users: { username: 'Player 1', first_name: 'Player', last_name: 'One' }
      },
      {
        user_id: '2',
        users: { username: 'Player 2', first_name: 'Player', last_name: 'Two' }
      },
      {
        user_id: '3',
        users: { username: 'Player 3', first_name: 'Player', last_name: 'Three' }
      },
      {
        user_id: '4',
        users: { username: 'Player 4', first_name: 'Player', last_name: 'Four' }
      }
    ]);
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
 