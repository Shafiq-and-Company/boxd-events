import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import styles from './SeedingPanel.module.css';

const SeedingPanel = ({ eventData, participants, onSeedingUpdate }) => {
  const [seedingMethod, setSeedingMethod] = useState('auto');
  const [isLoading, setIsLoading] = useState(false);

  const handleSeedingMethodChange = (method) => {
    setSeedingMethod(method);
  };

  const handleShuffle = () => {
    if (onSeedingUpdate) {
      onSeedingUpdate('shuffle');
    }
  };

  const handleResetSeeds = () => {
    if (onSeedingUpdate) {
      onSeedingUpdate('reset');
    }
  };

  const handleApplySeeding = () => {
    if (onSeedingUpdate) {
      onSeedingUpdate('apply', seedingMethod);
    }
  };

  return (
    <div className={styles.seedingPanel}>
      <div className={styles.panelHeader}>
        <h3 className={styles.panelTitle}>Seeding</h3>
        <div className={styles.panelActions}>
          <button 
            className={styles.applyButton}
            onClick={handleApplySeeding}
            disabled={isLoading}
          >
            {isLoading ? 'Applying...' : 'Apply'}
          </button>
        </div>
      </div>

      <div className={styles.panelContent}>
        <div className={styles.settingsGroup}>
          <div className={styles.inputGroup}>
            <label className={styles.label}>Seeding Method</label>
            <select
              value={seedingMethod}
              onChange={(e) => handleSeedingMethodChange(e.target.value)}
              className={styles.select}
            >
              <option value="auto">Auto</option>
              <option value="manual">Manual</option>
              <option value="ranks">Ranks</option>
            </select>
          </div>

          <div className={styles.buttonGroup}>
            <button 
              className={styles.actionButton}
              onClick={handleShuffle}
              disabled={isLoading}
            >
              Shuffle
            </button>
            <button 
              className={styles.actionButton}
              onClick={handleResetSeeds}
              disabled={isLoading}
            >
              Reset Seeds
            </button>
          </div>
        </div>

        <div className={styles.seedingInfo}>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Participants:</span>
            <span className={styles.infoValue}>{participants?.length || 0}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Method:</span>
            <span className={styles.infoValue}>{seedingMethod}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SeedingPanel;
