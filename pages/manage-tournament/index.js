import React from 'react';
import TitleCard from './TitleCard';
import styles from './manageTournament.module.css';

const ManageTournament = () => {
  return (
    <div className={styles.dashboard}>
      <div className={styles.mainContent}>
        <TitleCard title="Tournament Management" />
      </div>
    </div>
  );
};

export default ManageTournament;
