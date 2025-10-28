import { useEffect, useState, useRef } from 'react';
import tournamentManager from '../../lib/tournamentManager';
import styles from './tournament.module.css';

export default function BracketViewer({ tournamentId }) {
  const [bracketData, setBracketData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const containerRef = useRef(null);
  const scriptLoadedRef = useRef(false);

  // Load external scripts (CSR only)
  useEffect(() => {
    if (scriptLoadedRef.current) return;

    const loadScripts = () => {
      // Load CSS
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://cdn.jsdelivr.net/npm/brackets-viewer@1.8.1/dist/brackets-viewer.min.css';
      document.head.appendChild(link);

      // Add custom styles for transparent background, light theme, and hide title
      const customStyle = document.createElement('style');
      customStyle.textContent = `
        /* Light theme with transparent background */
        .brackets-viewer {
          --font-color: #1a1a1a;
          --primary-background: transparent;
          --secondary-background: #ffffff;
          --match-background: #ffffff;
          --connector-color: #d0d0d0;
          --border-color: #e0e0e0;
          --win-color: #50b498;
          --loss-color: #dc6868;
          height: 100%;
          display: flex;
          flex-direction: column;
        }

        /* Hide stage title in viewer */
        .brackets-viewer .stage-title {
          display: none;
        }

        /* Ensure connectors are visible */
        .brackets-viewer .connector {
          stroke: var(--connector-color);
          stroke-width: 2;
        }

        /* Match styling for light theme */
        .brackets-viewer .match {
          background-color: var(--match-background);
          border: 1px solid var(--border-color);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .brackets-viewer .participant {
          border-color: var(--border-color);
        }

        /* Ensure transparent background for container */
        .brackets-viewer,
        .brackets-viewer .bracket {
          background-color: transparent;
        }

        /* Fill container */
        .brackets-viewer .bracket,
        .brackets-viewer > div {
          flex: 1;
        }
      `;
      document.head.appendChild(customStyle);

      // Load JS
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/brackets-viewer@1.8.1/dist/brackets-viewer.min.js';
      script.async = true;
      script.onload = () => {
        scriptLoadedRef.current = true;
        if (bracketData) renderBracket();
      };
      script.onerror = () => setError('Failed to load bracket visualization library');
      document.head.appendChild(script);
    };

    loadScripts();
  }, []);

  // Load bracket data
  useEffect(() => {
    if (!tournamentId) return;

    const loadBracketData = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await tournamentManager.getBracketData(tournamentId);
        
        if (!data) {
          setError('No bracket data available yet. Create a tournament first.');
          return;
        }
        
        setBracketData(data);
      } catch (err) {
        console.error('Error loading bracket:', err);
        setError('Failed to load bracket data');
      } finally {
        setLoading(false);
      }
    };

    loadBracketData();
  }, [tournamentId]);

  // Render bracket when both data and scripts are ready
  useEffect(() => {
    if (bracketData && scriptLoadedRef.current) {
      renderBracket();
    }
  }, [bracketData]);

  const renderBracket = () => {
    if (!window.bracketsViewer || !containerRef.current) return;

    try {
      window.bracketsViewer.render(
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {loading && <div className={styles.loading}>Loading bracket...</div>}
      {error && <div className={styles.error}>{error}</div>}
      {!loading && !error && bracketData && (
        <div 
          className={`${styles.bracketContainer} brackets-viewer`} 
          ref={containerRef}
        />
      )}
    </div>
  );
}
