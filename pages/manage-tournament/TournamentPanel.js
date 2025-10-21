import React, { useState } from 'react';
import styles from './TournamentPanel.module.css';

const TournamentPanel = ({ eventData, onSettingsUpdate }) => {
  const [tournamentSettings, setTournamentSettings] = useState({
    max_participants: 16,
    status: 'registration',
    tournament_type: 'single_elimination'
  });

  const handleInputChange = (field, value) => {
    setTournamentSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = () => {
    if (onSettingsUpdate) {
      onSettingsUpdate(tournamentSettings);
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
          >
            Update
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
            <label className={styles.label}>Max Participants</label>
            <input
              type="number"
              value={tournamentSettings.max_participants}
              onChange={(e) => handleInputChange('max_participants', parseInt(e.target.value))}
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
