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
    onSeedingUpdate('randomize', 'random');
  };

  const handleResetSeeds = () => {
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
                <div className={styles.formatHeader}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={styles.formatIcon}>
                    <path d="M3 3h18v18H3z"/>
                    <path d="M9 9h6v6H9z"/>
                    <path d="M3 9h6"/>
                    <path d="M15 9h6"/>
                    <path d="M3 15h6"/>
                    <path d="M15 15h6"/>
                  </svg>
                  <span className={styles.formatText}>Format</span>
                </div>
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
                <div className={styles.seedingHeader}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={styles.seedingIcon}>
                    <path d="M3 3h18v18H3z"/>
                    <path d="M9 9h6v6H9z"/>
                    <path d="M3 9h6"/>
                    <path d="M15 9h6"/>
                    <path d="M3 15h6"/>
                    <path d="M15 15h6"/>
                    <circle cx="12" cy="12" r="2"/>
                  </svg>
                  <span className={styles.seedingText}>Seeding Method</span>
                </div>
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
                  <button 
                    className={styles.resetSeedsButton}
                    onClick={handleResetSeeds}
                    type="button"
                    title="Reset Seeds"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                      <path d="M21 3v5h-5"/>
                      <path d="M8 12h8"/>
                      <path d="M12 8v8"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            
            <div className={styles.participantsSection}>
              <h3 className={styles.sectionTitle}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={styles.sectionIcon}>
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                Participants
              </h3>
              <p className={styles.seedingSubtitle}>
                Seeding: {seedingMethod === 'random' ? 'Random' : 'Manual'}
              </p>
              <div className={styles.participantsList}>
                {participants.length > 0 ? (
                  participants.map((participant, index) => {
                    const colors = [
                      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
                      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
                      '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#D7BDE2'
                    ];
                    const randomColor = colors[index % colors.length];
                    
                    return (
                      <div key={participant.user_id} className={styles.participantItem}>
                        <span 
                          className={styles.participantNumber}
                          style={{ backgroundColor: randomColor }}
                        >
                          {index + 1}
                        </span>
                        <div className={styles.participantInfo}>
                          <span className={styles.participantName}>
                            {participant.users?.username || 'Unknown User'}
                            {participant.users?.first_name || participant.users?.last_name ? (
                              <>
                                <span className={styles.nameSeparator}> | </span>
                                <span className={styles.participantFullName}>
                                  {`${participant.users?.first_name || ''} ${participant.users?.last_name || ''}`.trim()}
                                </span>
                              </>
                            ) : null}
                          </span>
                        </div>
                        {seedingMethod === 'manual' && (
                          <div className={styles.grabHandle}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="9" cy="12" r="1"/>
                              <circle cx="9" cy="5" r="1"/>
                              <circle cx="9" cy="19" r="1"/>
                              <circle cx="20" cy="12" r="1"/>
                              <circle cx="20" cy="5" r="1"/>
                              <circle cx="20" cy="19" r="1"/>
                            </svg>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className={styles.noParticipants}>
                    <span>No participants yet</span>
                  </div>
                )}
              </div>
            </div>
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
