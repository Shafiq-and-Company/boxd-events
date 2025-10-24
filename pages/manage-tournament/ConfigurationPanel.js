import React from 'react';
import styles from './ConfigurationPanel.module.css';

const ConfigurationPanel = ({ eventData, participants, onTournamentUpdate, onSeedingUpdate }) => {
  return (
    <div className={styles.configurationPanel}>
      <div className={styles.panelContent}>
        {/* Configuration content will go here */}
      </div>
    </div>
  );
};

export default ConfigurationPanel;
