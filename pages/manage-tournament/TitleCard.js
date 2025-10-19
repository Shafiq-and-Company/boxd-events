import React from 'react';
import styles from './TitleCard.module.css';

const TitleCard = ({ title, eventData }) => {
  return (
    <div className={styles.sectionHeader}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      {eventData && (
        <div className={styles.eventInfo}>
          <h3 className={styles.eventTitle}>{eventData.title}</h3>
          <p className={styles.eventGame}>{eventData.game_title}</p>
        </div>
      )}
    </div>
  );
};

export default TitleCard;
