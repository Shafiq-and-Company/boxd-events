import React from 'react';
import styles from './Participants.module.css';

const Participants = ({ participants, loadingParticipants }) => {
  if (loadingParticipants) {
    return (
      <div className={styles.loadingState}>
        <div className={styles.loadingSpinner}></div>
        <p>Loading participants...</p>
      </div>
    );
  }

  if (participants.length === 0) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
        </div>
        <h3>No participants yet</h3>
        <p>Participants will appear here once they RSVP to your event.</p>
      </div>
    );
  }

  return (
    <div className={styles.participantsList}>
      <div className={styles.participantsHeader}>
        <span className={styles.participantCount}>
          {participants.length} participant{participants.length !== 1 ? 's' : ''}
        </span>
      </div>
      {participants.map((participant, index) => (
        <div key={participant.user_id} className={styles.participantItem}>
          <div className={styles.participantNumber}>#{index + 1}</div>
          <div className={styles.participantAvatar}>
            <div className={styles.avatarInitial}>
              {(participant.users?.username?.charAt(0) || 
                participant.users?.first_name?.charAt(0) || 
                'U').toUpperCase()}
            </div>
          </div>
          <div className={styles.participantInfo}>
            <div className={styles.participantName}>
              {participant.users?.username || 
               participant.users?.first_name || 
               'Unknown User'}
            </div>
            <div className={styles.participantEmail}>
              {participant.users?.email}
            </div>
          </div>
          <div className={styles.participantStatus}>
            <span className={styles.statusBadge}>
              {participant.status}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Participants;
