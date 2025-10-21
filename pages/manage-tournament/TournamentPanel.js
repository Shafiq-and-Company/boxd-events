import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { generateBracketData, updateTournamentMatches, fetchTournamentParticipants, clearTournamentMatches } from '../../lib/singleElimination';
import { generateBracketData as generateDoubleEliminationBracket, updateTournamentMatches as updateDoubleEliminationMatches, fetchTournamentParticipants as fetchDoubleEliminationParticipants, clearTournamentMatches as clearDoubleEliminationMatches } from '../../lib/doubleElimination';
import { generateBracketData as generateRoundRobinBracket, updateTournamentMatches as updateRoundRobinMatches, fetchTournamentParticipants as fetchRoundRobinParticipants, clearTournamentMatches as clearRoundRobinMatches } from '../../lib/roundRobin';
import { generateBracketData as generateSwissBracket, updateTournamentMatches as updateSwissMatches, fetchTournamentParticipants as fetchSwissParticipants, clearTournamentMatches as clearSwissMatches } from '../../lib/swiss';
import styles from './TournamentPanel.module.css';

const TournamentPanel = ({ eventData, onSettingsUpdate }) => {
  const [tournamentSettings, setTournamentSettings] = useState({
    min_participants: 2,
    status: 'registration',
    tournament_type: 'single_elimination'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [originalTournamentType, setOriginalTournamentType] = useState('single_elimination');

  const handleInputChange = (field, value) => {
    setTournamentSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Load existing tournament data when eventData changes
  useEffect(() => {
    if (eventData?.id) {
      fetchTournamentData();
    }
  }, [eventData?.id]);

  const fetchTournamentData = async () => {
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .eq('event_id', eventData.id)
        .single();

      if (data && !error) {
        setTournamentSettings({
          min_participants: data.min_participants || 2,
          status: data.status,
          tournament_type: data.tournament_type
        });
        setOriginalTournamentType(data.tournament_type);
      }
    } catch (err) {
      console.error('Error fetching tournament data:', err);
    }
  };

  const handleSave = async () => {
    if (!eventData?.id) {
      return;
    }

    setIsLoading(true);

    try {
      // Check if tournament already exists
      const { data: existingTournament, error: fetchError } = await supabase
        .from('tournaments')
        .select('id, tournament_type, bracket_data')
        .eq('event_id', eventData.id)
        .single();

      // Prepare update data
      const updateData = {
        min_participants: tournamentSettings.min_participants,
        status: tournamentSettings.status,
        tournament_type: tournamentSettings.tournament_type,
        updated_at: new Date().toISOString()
      };

      // Check if tournament type changed or if this is a new tournament
      const tournamentTypeChanged = originalTournamentType !== tournamentSettings.tournament_type;
      const isNewTournament = !existingTournament || fetchError;

      if (tournamentTypeChanged || isNewTournament) {
        console.log('Tournament type changed or new tournament, regenerating bracket data...');
        
        // Get the appropriate functions based on tournament type
        let fetchParticipants, generateBracket, updateMatches, clearMatches;
        
        switch (tournamentSettings.tournament_type) {
          case 'single_elimination':
            fetchParticipants = fetchTournamentParticipants;
            generateBracket = generateBracketData;
            updateMatches = updateTournamentMatches;
            clearMatches = clearTournamentMatches;
            break;
          case 'double_elimination':
            fetchParticipants = fetchDoubleEliminationParticipants;
            generateBracket = generateDoubleEliminationBracket;
            updateMatches = updateDoubleEliminationMatches;
            clearMatches = clearDoubleEliminationMatches;
            break;
          case 'round_robin':
            fetchParticipants = fetchRoundRobinParticipants;
            generateBracket = generateRoundRobinBracket;
            updateMatches = updateRoundRobinMatches;
            clearMatches = clearRoundRobinMatches;
            break;
          case 'swiss':
            fetchParticipants = fetchSwissParticipants;
            generateBracket = generateSwissBracket;
            updateMatches = updateSwissMatches;
            clearMatches = clearSwissMatches;
            break;
          default:
            throw new Error(`Unsupported tournament type: ${tournamentSettings.tournament_type}`);
        }

        // Fetch current participants
        const participants = await fetchParticipants(eventData.id, supabase);
        
        if (participants.length < tournamentSettings.min_participants) {
          setIsLoading(false);
          return;
        }

        // Generate new bracket data
        const newBracketData = generateBracket(
          tournamentSettings.tournament_type,
          participants,
          tournamentSettings.min_participants
        );
        
        updateData.bracket_data = newBracketData;

        // Update tournament matches if tournament exists
        if (existingTournament && !fetchError) {
          // Clear existing matches when tournament type changes
          await clearMatches(existingTournament.id, supabase);
          // Create new matches for the new tournament type
          await updateMatches(existingTournament.id, newBracketData, supabase);
        }
      }

      let result;
      if (existingTournament && !fetchError) {
        // Update existing tournament
        result = await supabase
          .from('tournaments')
          .update(updateData)
          .eq('event_id', eventData.id);
      } else {
        // Create new tournament
        result = await supabase
          .from('tournaments')
          .insert({
            event_id: eventData.id,
            ...updateData
          });
      }

      if (result.error) {
        console.error('Database error:', result.error);
        throw result.error;
      }

      // Update original tournament type to current value
      setOriginalTournamentType(tournamentSettings.tournament_type);

      console.log('Tournament updated successfully:', result.data);
      
      // Call parent callback if provided
      if (onSettingsUpdate) {
        onSettingsUpdate(tournamentSettings);
      }

    } catch (error) {
      console.error('Error updating tournament:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.tournamentPanel}>
      <div className={styles.panelHeader}>
        <h3 className={styles.panelTitle}>Tournament Settings</h3>
        <div className={styles.panelActions}>
          <button 
            className={styles.saveButton}
            onClick={handleSave}
            disabled={isLoading}
          >
            {isLoading ? 'Updating...' : 'Update'}
          </button>
        </div>
      </div>

      <div className={styles.panelContent}>
        <div className={styles.settingsGroup}>
          <div className={styles.inputGroup}>
            <label className={styles.label}>Tournament Type</label>
            <select
              value={tournamentSettings.tournament_type}
              onChange={(e) => handleInputChange('tournament_type', e.target.value)}
              className={styles.select}
            >
              <option value="single_elimination">Single Elimination</option>
              <option value="double_elimination">Double Elimination</option>
              <option value="round_robin">Round Robin</option>
              <option value="swiss">Swiss</option>
            </select>
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Min Participants</label>
            <input
              type="number"
              value={tournamentSettings.min_participants}
              onChange={(e) => handleInputChange('min_participants', parseInt(e.target.value))}
              className={`${styles.input} ${styles.numberInput}`}
              min="2"
              max="64"
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Status</label>
            <select
              value={tournamentSettings.status}
              onChange={(e) => handleInputChange('status', e.target.value)}
              className={styles.select}
            >
              <option value="registration">Registration</option>
              <option value="seeding">Seeding</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

      </div>
    </div>
  );
};

export default TournamentPanel;
