import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { generateBracketData, updateTournamentMatches, fetchTournamentParticipants, clearTournamentMatches } from '../../lib/tournamentUtils';
import styles from './TournamentPanel.module.css';

const TournamentPanel = ({ eventData, onSettingsUpdate }) => {
  const [tournamentSettings, setTournamentSettings] = useState({
    min_participants: 2,
    status: 'registration',
    tournament_type: 'single_elimination'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
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
      setMessage('No event data available');
      return;
    }

    setIsLoading(true);
    setMessage('');

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
        setMessage('Tournament type changed. Clearing existing matches and generating new bracket...');
        
        // Fetch current participants
        const participants = await fetchTournamentParticipants(eventData.id, supabase);
        
        if (participants.length < tournamentSettings.min_participants) {
          setMessage(`Need at least ${tournamentSettings.min_participants} participants. Currently have ${participants.length}.`);
          setIsLoading(false);
          return;
        }

        // Generate new bracket data
        const newBracketData = generateBracketData(
          tournamentSettings.tournament_type,
          participants,
          tournamentSettings.min_participants
        );
        
        updateData.bracket_data = newBracketData;

        // Update tournament matches if tournament exists
        if (existingTournament && !fetchError) {
          // Clear existing matches when tournament type changes
          await clearTournamentMatches(existingTournament.id, supabase);
          // Create new matches for the new tournament type
          await updateTournamentMatches(existingTournament.id, newBracketData, supabase);
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
      setMessage('Tournament settings updated successfully!');
      
      // Call parent callback if provided
      if (onSettingsUpdate) {
        onSettingsUpdate(tournamentSettings);
      }

      // Clear message after 3 seconds
      setTimeout(() => setMessage(''), 3000);

    } catch (error) {
      console.error('Error updating tournament:', error);
      setMessage('Failed to update tournament settings');
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

        {message && (
          <div className={styles.message}>
            {message}
          </div>
        )}

      </div>
    </div>
  );
};

export default TournamentPanel;
