import React from 'react';
import styles from './VisualizationPanel.module.css';

const VisualizationPanel = ({ eventData, participants, refreshTrigger }) => {
  return (
    <div className={styles.visualizationPanel}>
      <div className={styles.panelContent}>
        <h2 className={styles.panelTitle}>Visualization</h2>
        {/* Bracket visualization content will go here */}
      </div>
    </div>
  );
};

export default VisualizationPanel;
