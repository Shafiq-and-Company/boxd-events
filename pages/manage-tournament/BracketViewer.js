import { useEffect, useState } from 'react';
import tournamentManager from '../../lib/tournamentManager';
import styles from './tournament.module.css';

export default function BracketViewer({ tournamentId }) {
  const [bracketData, setBracketData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBracketData();
  }, [tournamentId]);

  const loadBracketData = async () => {
    try {
      setLoading(true);
      const data = await tournamentManager.getBracketData(tournamentId);
      setBracketData(data);
    } catch (error) {
      console.error('Error loading bracket:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading bracket...</div>;
  if (!bracketData) return <div>No bracket data available</div>;

  return (
    <div>
      <h3>Tournament Bracket</h3>
      <div className={styles.bracketContainer}>
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <p>Bracket viewer will be implemented here</p>
          <p>Bracket data loaded: {bracketData ? 'Yes' : 'No'}</p>
        </div>
      </div>
    </div>
  );
}
