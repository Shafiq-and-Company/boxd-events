import React from 'react';
import styles from './ScorekeepingPanel.module.css';

const ScorekeepingPanel = ({ eventData, participants, onMatchUpdate }) => {
  return (
    <div className={styles.scorekeepingPanel}>
      <div className={styles.panelContent}>
        {/* Scorekeeping content will go here */}
      </div>
    </div>
  );
};

export default ScorekeepingPanel;
