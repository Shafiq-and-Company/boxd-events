import React, { useState } from 'react';
import styles from './ConfigurationPanel.module.css';

const ConfigurationPanel = ({ eventData, participants, onTournamentUpdate, onSeedingUpdate, onTournamentLiveChange }) => {
  const [isTournamentLive, setIsTournamentLive] = useState(false);
  const [seedingMethod, setSeedingMethod] = useState('random');

  const handleToggleChange = () => {
    const newState = !isTournamentLive;
    setIsTournamentLive(newState);
    onTournamentLiveChange(newState);
  };

  const handleSeedingChange = (method) => {
    setSeedingMethod(method);
  };

  const handleRandomize = () => {
    // Handle randomize action
    console.log('Randomizing seeding...');
    onSeedingUpdate('randomize', 'random');
  };

  const handleResetSeeds = () => {
    // Handle reset seeds action
    console.log('Resetting seeds...');
    onSeedingUpdate('reset', seedingMethod);
  };

  return (
    <div className={`${styles.configurationPanel} ${isTournamentLive ? styles.collapsed : ''}`}>
      <div className={styles.panelContent}>
        {!isTournamentLive && (
          <>
            <h2 className={styles.panelTitle}>Configuration Panel</h2>
            
            <div className={styles.tournamentStatusSection}>
              <div className={styles.toggleContainer}>
                <label className={styles.toggleLabel}>
                  <div className={styles.labelContent}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={styles.unlockIcon}>
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 9.9-1"/>
                    </svg>
                    <span>Tournament Live</span>
                  </div>
                  <div className={styles.toggleWrapper}>
                    <input
                      type="checkbox"
                      checked={isTournamentLive}
                      onChange={handleToggleChange}
                      className={styles.toggleInput}
                    />
                    <span className={styles.toggleSlider}></span>
                  </div>
                </label>
              </div>
              <p className={styles.statusText}>Your Tournament is Open to Changes</p>
            </div>
            
            <div className={styles.formatSection}>
              <label className={styles.formatLabel}>
                <span className={styles.formatText}>Format</span>
                <select className={styles.formatDropdown}>
                  <option value="single-elimination">Single Elimination</option>
                  <option value="double-elimination">Double Elimination</option>
                  <option value="round-robin">Round Robin</option>
                  <option value="swiss">Swiss</option>
                </select>
              </label>
            </div>
            
            <div className={styles.seedingSection}>
              <div className={styles.seedingLabel}>
                <span className={styles.seedingText}>Seeding Method</span>
                <div className={styles.seedingSelector}>
                  <label className={styles.seedingOption}>
                    <input 
                      type="radio" 
                      name="seeding" 
                      value="manual" 
                      className={styles.seedingInput}
                      checked={seedingMethod === 'manual'}
                      onChange={() => handleSeedingChange('manual')}
                    />
                    <span className={styles.seedingOptionText}>Manual</span>
                  </label>
                  <label className={styles.seedingOption}>
                    <input 
                      type="radio" 
                      name="seeding" 
                      value="random" 
                      className={styles.seedingInput}
                      checked={seedingMethod === 'random'}
                      onChange={() => handleSeedingChange('random')}
                    />
                    <span className={styles.seedingOptionText}>Random</span>
                    {seedingMethod === 'random' && (
                      <button 
                        className={styles.randomizeButton}
                        onClick={handleRandomize}
                        type="button"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                          <path d="M21 3v5h-5"/>
                          <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
                          <path d="M3 21v-5h5"/>
                        </svg>
                      </button>
                    )}
                  </label>
                </div>
              </div>
              
              <div className={styles.resetSeedsSection}>
                <button 
                  className={styles.resetSeedsButton}
                  onClick={handleResetSeeds}
                  type="button"
                >
                  <span>Reset Seeds</span>
                </button>
              </div>
            </div>
            
            <div className={styles.participantsSection}>
              <h3 className={styles.sectionTitle}>Participants</h3>
              <div className={styles.participantsList}>
                {participants.length > 0 ? (
                  participants.map((participant, index) => (
                    <div key={participant.user_id} className={styles.participantItem}>
                      <span className={styles.participantNumber}>{index + 1}</span>
                      <span className={styles.participantName}>
                        {participant.users?.username || 
                         `${participant.users?.first_name || ''} ${participant.users?.last_name || ''}`.trim() ||
                         'Unknown User'}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className={styles.noParticipants}>
                    <span>No participants yet</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Configuration content will go here */}
          </>
        )}
        
        {isTournamentLive && (
          <div className={styles.collapsedContent}>
            <div className={styles.toggleContainer}>
              <label className={styles.collapsedToggleLabel}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={styles.unlockIcon}>
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <div className={styles.toggleWrapper}>
                  <input
                    type="checkbox"
                    checked={isTournamentLive}
                    onChange={handleToggleChange}
                    className={styles.toggleInput}
                  />
                  <span className={`${styles.toggleSlider} ${styles.collapsedToggleSlider}`}></span>
                </div>
                <span className={styles.collapsedText}>Toggle to Unlock Configuration</span>
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConfigurationPanel;
