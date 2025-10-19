import React from 'react';
import styles from './EventTimeline.module.css';

const EventTimeline = () => {
  const timelineEvents = [
    {
      label: 'Registration Deadline:',
      value: 'March 15, 2024 at 11:59 PM'
    },
    {
      label: 'Tournament Start:',
      value: 'March 16, 2024 at 2:00 PM'
    },
    {
      label: 'Expected Duration:',
      value: '4-6 hours'
    },
    {
      label: 'Check-in Time:',
      value: '1:30 PM (30 min before start)'
    }
  ];

  return (
    <div className={styles.scheduleSection}>
      <div className={styles.scheduleCard}>
        <div className={styles.scheduleHeader}>
          <h3 className={styles.scheduleTitle}>Event Timeline</h3>
        </div>
        <div className={styles.scheduleInfo}>
          {timelineEvents.map((event, index) => (
            <div key={index} className={styles.scheduleItem}>
              <span className={styles.scheduleLabel}>{event.label}</span>
              <span className={styles.scheduleValue}>{event.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EventTimeline;
