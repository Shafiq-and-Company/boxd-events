import React, { useState } from 'react';
import styles from './PlayerPanel.module.css';

const PlayerPanel = () => {
  const [activeBrackets, setActiveBrackets] = useState([
    { id: 1, name: 'Main Bracket', status: 'Active', participants: 16 },
    { id: 2, name: 'Consolation Bracket', status: 'Pending', participants: 8 }
  ]);

  const [playerSettings, setPlayerSettings] = useState({
    allowSpectators: true,
    showPlayerStats: true,
    enableChat: false,
    autoAdvance: true
  });

  const handleToggleSetting = (setting) => {
    setPlayerSettings(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }));
  };

  const handleBracketAction = (bracketId, action) => {
    console.log(`${action} bracket ${bracketId}`);
  };

  return (
    <div className={styles.panelCard}>
      <div className={styles.panelHeader}>
        <h3 className={styles.panelTitle}>Player Panel</h3>
      </div>
      
      <div className={styles.panelContent}>
        {/* Active Brackets Section */}
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>Active Brackets</h4>
          <div className={styles.bracketsList}>
            {activeBrackets.map((bracket) => (
              <div key={bracket.id} className={styles.bracketItem}>
                <div className={styles.bracketInfo}>
                  <span className={styles.bracketName}>{bracket.name}</span>
                  <span className={styles.bracketParticipants}>
                    {bracket.participants} participants
                  </span>
                </div>
                <div className={styles.bracketStatus}>
                  <span className={`${styles.statusBadge} ${styles[bracket.status.toLowerCase()]}`}>
                    {bracket.status}
                  </span>
                </div>
                <div className={styles.bracketActions}>
                  <button 
                    className={styles.actionButton}
                    onClick={() => handleBracketAction(bracket.id, 'view')}
                  >
                    View
                  </button>
                  <button 
                    className={styles.actionButton}
                    onClick={() => handleBracketAction(bracket.id, 'edit')}
                  >
                    Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Player Settings Section */}
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>Player Settings</h4>
          <div className={styles.settingsList}>
            <div className={styles.settingItem}>
              <label className={styles.settingLabel}>
                <input
                  type="checkbox"
                  checked={playerSettings.allowSpectators}
                  onChange={() => handleToggleSetting('allowSpectators')}
                  className={styles.settingCheckbox}
                />
                Allow Spectators
              </label>
            </div>
            
            <div className={styles.settingItem}>
              <label className={styles.settingLabel}>
                <input
                  type="checkbox"
                  checked={playerSettings.showPlayerStats}
                  onChange={() => handleToggleSetting('showPlayerStats')}
                  className={styles.settingCheckbox}
                />
                Show Player Stats
              </label>
            </div>
            
            <div className={styles.settingItem}>
              <label className={styles.settingLabel}>
                <input
                  type="checkbox"
                  checked={playerSettings.enableChat}
                  onChange={() => handleToggleSetting('enableChat')}
                  className={styles.settingCheckbox}
                />
                Enable Chat
              </label>
            </div>
            
            <div className={styles.settingItem}>
              <label className={styles.settingLabel}>
                <input
                  type="checkbox"
                  checked={playerSettings.autoAdvance}
                  onChange={() => handleToggleSetting('autoAdvance')}
                  className={styles.settingCheckbox}
                />
                Auto Advance Winners
              </label>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>Quick Actions</h4>
          <div className={styles.quickActions}>
            <button className={styles.quickButton}>
              Generate Brackets
            </button>
            <button className={styles.quickButton}>
              Start Tournament
            </button>
            <button className={styles.quickButton}>
              Pause Tournament
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerPanel;
