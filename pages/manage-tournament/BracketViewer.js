import { useEffect, useState, useRef } from 'react';
import Script from 'next/script';
import tournamentManager from '../../lib/tournamentManager';
import styles from './tournament.module.css';

export default function BracketViewer({ tournamentId }) {
  const [bracketData, setBracketData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [scriptsLoaded, setScriptsLoaded] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    loadBracketData();
  }, [tournamentId]);

  const loadBracketData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await tournamentManager.getBracketData(tournamentId);
      
      if (!data) {
        setError('No bracket data available yet. Create a tournament first.');
        return;
      }
      
      console.log('Loaded bracket data:', data);
      setBracketData(data);
    } catch (error) {
      console.error('Error loading bracket:', error);
      setError('Failed to load bracket data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (bracketData && scriptsLoaded && containerRef.current && typeof window !== 'undefined') {
      renderBracket();
    }
  }, [bracketData, scriptsLoaded]);

  const renderBracket = async () => {
    try {
      // Wait for window.bracketsViewer to be available
      if (!window.bracketsViewer) {
        console.error('bracketsViewer not available on window');
        setError('Bracket viewer library failed to load');
        return;
      }

      // Use the global bracketsViewer from the CDN
      // The selector should be a CSS selector string, not a DOM element
      await window.bracketsViewer.render(
        {
          stages: bracketData.stage || [],
          matches: bracketData.match || [],
          matchGames: bracketData.match_game || [],
          participants: bracketData.participant || [],
        },
        {
          selector: '.brackets-viewer',
          participantOriginPlacement: 'before',
          separatedChildCountLabel: true,
          showSlotsOrigin: true,
          showLowerBracketSlotsOrigin: true,
          highlightParticipantOnHover: true,
          clear: true,
        }
      );
    } catch (err) {
      console.error('Error rendering bracket:', err);
      setError('Failed to render bracket: ' + err.message);
    }
  };

  return (
    <>
      {/* Load brackets-viewer from CDN */}
      <Script
        src="https://cdn.jsdelivr.net/npm/brackets-viewer@1.8.1/dist/brackets-viewer.min.js"
        strategy="afterInteractive"
        onLoad={() => {
          console.log('Brackets viewer script loaded');
          setScriptsLoaded(true);
        }}
        onError={(e) => {
          console.error('Failed to load brackets-viewer script:', e);
          setError('Failed to load bracket visualization library');
        }}
      />
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/brackets-viewer@1.8.1/dist/brackets-viewer.min.css"
      />
      <div>
        <h3>Tournament Bracket</h3>
        {loading && <div className={styles.loading}>Loading bracket...</div>}
        {error && <div className={styles.error}>{error}</div>}
        {!loading && !error && !bracketData && (
          <div className={styles.noBracket}>No bracket data available</div>
        )}
        {!loading && !error && bracketData && !scriptsLoaded && (
          <div className={styles.loading}>Loading bracket viewer...</div>
        )}
        {!loading && !error && bracketData && scriptsLoaded && (
          <div 
            className={`${styles.bracketContainer} brackets-viewer`} 
            ref={containerRef}
          />
        )}
      </div>
    </>
  );
}
