import { useState, useEffect } from 'react';
import tournamentManager from '../../lib/tournamentManager';
import styles from './tournament.module.css';

// Helper function to check if a number is a power of 2
function isPowerOfTwo(n) {
  return n > 0 && (n & (n - 1)) === 0;
}

// Helper function to calculate BYE count
function getByeCount(participantCount) {
  if (participantCount < 2) return 0;
  const nextPowerOfTwo = Math.pow(2, Math.ceil(Math.log2(participantCount)));
  return nextPowerOfTwo - participantCount;
}

export default function ParticipantsList({ tournamentId }) {
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadParticipants();
  }, [tournamentId]);

  const loadParticipants = async () => {
    try {
      setLoading(true);
      
      // First check if tournament needs to be regenerated
      await tournamentManager.checkAndRegenerateTournament(tournamentId);
      
      const participantsData = await tournamentManager.getParticipants(tournamentId);
      setParticipants(participantsData);
    } catch (err) {
      console.error('Error loading participants:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className={styles.loading}>
      <img src="/dance-duck.gif" alt="Loading..." />
    </div>
  );
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h2 className={styles.columnTitle}>Participants ({participants.length})</h2>
      <div className={styles.participantsList}>
        {participants.map(participant => (
          <div key={participant.id} className={`${styles.participantItem} ${participant.isHost ? styles.hostParticipant : ''}`}>
            <div className={styles.participantUsername}>{participant.name}</div>
            {(participant.firstName || participant.lastName) && (
              <div className={styles.participantFullName}>
                {participant.firstName} {participant.lastName}
              </div>
            )}
            {participant.isHost && <span className={styles.hostBadge}>Host</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
