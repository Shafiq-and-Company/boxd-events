import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import styles from './BracketVisualization.module.css';

const BracketVisualization = ({ eventData, refreshTrigger }) => {
  const [bracketData, setBracketData] = useState(null);
  const [tournamentInfo, setTournamentInfo] = useState({
    participantCount: 0,
    tournamentFormat: 'Single Elimination'
  });
  const [expandedSections, setExpandedSections] = useState({});

  // Fetch tournament data when eventData changes or refresh is triggered
  useEffect(() => {
    if (eventData?.id) {
      fetchTournamentData();
    }
  }, [eventData?.id, refreshTrigger]);

  const fetchTournamentData = async () => {
    try {
      const { data: tournament, error } = await supabase
        .from('tournaments')
        .select('*')
        .eq('event_id', eventData.id)
        .single();

      if (tournament && !error) {
        setBracketData(tournament.bracket_data);
        setTournamentInfo({
          participantCount: tournament.bracket_data?.participants?.length || 0,
          tournamentFormat: getTournamentFormatName(tournament.tournament_type)
        });
      }
    } catch (err) {
      console.error('Error fetching tournament data:', err);
    }
  };

  const getTournamentFormatName = (type) => {
    const formats = {
      'single_elimination': 'Single Elimination',
      'double_elimination': 'Double Elimination',
      'round_robin': 'Round Robin',
      'swiss': 'Swiss'
    };
    return formats[type] || 'Single Elimination';
  };

  const toggleSection = (sectionKey) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  const renderJsonValue = (value, key = '', depth = 0) => {
    if (value === null) return <span className={styles.nullValue}>null</span>;
    if (value === undefined) return <span className={styles.undefinedValue}>undefined</span>;
    
    if (typeof value === 'boolean') {
      return <span className={styles.booleanValue}>{value.toString()}</span>;
    }
    
    if (typeof value === 'number') {
      return <span className={styles.numberValue}>{value}</span>;
    }
    
    if (typeof value === 'string') {
      return <span className={styles.stringValue}>"{value}"</span>;
    }
    
    if (Array.isArray(value)) {
      const arrayKey = key || 'array';
      const isExpanded = expandedSections[arrayKey];
      
      return (
        <div className={styles.arrayContainer}>
          <button 
            className={styles.expandButton}
            onClick={() => toggleSection(arrayKey)}
          >
            <span className={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</span>
            <span className={styles.arrayBracket}>[</span>
            <span className={styles.arrayLength}>{value.length} items</span>
            <span className={styles.arrayBracket}>]</span>
          </button>
          {isExpanded && (
            <div className={styles.arrayContent}>
              {value.map((item, index) => (
                <div key={index} className={styles.arrayItem}>
                  <span className={styles.arrayIndex}>{index}:</span>
                  {renderJsonValue(item, `${arrayKey}[${index}]`, depth + 1)}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }
    
    if (typeof value === 'object') {
      const objectKey = key || 'object';
      const isExpanded = expandedSections[objectKey];
      const entries = Object.entries(value);
      
      return (
        <div className={styles.objectContainer}>
          <button 
            className={styles.expandButton}
            onClick={() => toggleSection(objectKey)}
          >
            <span className={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</span>
            <span className={styles.objectBracket}>{'{'}</span>
            <span className={styles.objectLength}>{entries.length} properties</span>
            <span className={styles.objectBracket}>{'}'}</span>
          </button>
          {isExpanded && (
            <div className={styles.objectContent}>
              {entries.map(([objKey, objValue]) => (
                <div key={objKey} className={styles.objectItem}>
                  <span className={styles.objectKey}>"{objKey}":</span>
                  {renderJsonValue(objValue, `${objectKey}.${objKey}`, depth + 1)}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }
    
    return <span className={styles.unknownValue}>{String(value)}</span>;
  };

  const renderTournamentSpecificData = () => {
    if (!bracketData) return null;

    const getTournamentTypeIcon = (type) => {
      switch (type) {
        case 'single_elimination':
          return '🏆';
        case 'double_elimination':
          return '🥇';
        case 'round_robin':
          return '🔄';
        case 'swiss':
          return '♟️';
        default:
          return '🏅';
      }
    };

    const getTournamentTypeDescription = (type) => {
      switch (type) {
        case 'single_elimination':
          return 'Single elimination tournament where players are eliminated after one loss';
        case 'double_elimination':
          return 'Double elimination tournament where players need two losses to be eliminated';
        case 'round_robin':
          return 'Round robin tournament where every player plays every other player';
        case 'swiss':
          return 'Swiss tournament with multiple rounds and pairings based on performance';
        default:
          return 'Tournament format';
      }
    };

    const sections = [
      {
        key: 'tournamentInfo',
        title: `Tournament Info ${getTournamentTypeIcon(bracketData.tournamentType)}`,
        data: {
          tournamentType: bracketData.tournamentType,
          currentRound: bracketData.currentRound,
          totalRounds: bracketData.totalRounds,
          participantCount: bracketData.participants?.length || 0,
          description: getTournamentTypeDescription(bracketData.tournamentType),
          tournamentComplete: bracketData.tournamentComplete || false,
          winner: bracketData.winner || null
        }
      },
      {
        key: 'participants',
        title: `Participants (${bracketData.participants?.length || 0})`,
        data: bracketData.participants || []
      },
      {
        key: 'rounds',
        title: `Rounds (${bracketData.rounds?.length || 0})`,
        data: bracketData.rounds || []
      }
    ];

    // Add tournament completion status if tournament is complete
    if (bracketData.tournamentComplete && bracketData.winner) {
      sections.push({
        key: 'tournamentResults',
        title: `🏆 Tournament Complete - Winner: ${bracketData.winner.username || 'Unknown'}`,
        data: {
          status: 'COMPLETED',
          winner: bracketData.winner,
          completedAt: new Date().toISOString()
        }
      });
    }

    // Add tournament-specific sections based on type
    if (bracketData.tournamentType === 'double_elimination') {
      const winnersRounds = bracketData.rounds?.filter(round => round.bracket === 'winners') || [];
      const losersRounds = bracketData.rounds?.filter(round => round.bracket === 'losers') || [];
      const grandFinals = bracketData.rounds?.filter(round => round.bracket === 'grand_finals') || [];

      sections.push(
        {
          key: 'winnersBracket',
          title: `Winners Bracket (${winnersRounds.length} rounds)`,
          data: winnersRounds
        },
        {
          key: 'losersBracket',
          title: `Losers Bracket (${losersRounds.length} rounds)`,
          data: losersRounds
        },
        {
          key: 'grandFinals',
          title: `Grand Finals (${grandFinals.length} rounds)`,
          data: grandFinals
        }
      );
    }

    return sections.map(section => (
      <div key={section.key} className={styles.section}>
        <h3 className={styles.sectionTitle}>{section.title}</h3>
        <div className={styles.sectionContent}>
          {renderJsonValue(section.data, section.key)}
        </div>
      </div>
    ));
  };

  return (
    <div className={styles.bracketContainer}>
      <div className={styles.bracketHeader}>
        <h2 className={styles.bracketTitle}>Tournament Data</h2>
        <div className={styles.bracketInfo}>
          <span className={styles.participantCount}>{tournamentInfo.participantCount} players</span>
          <span className={styles.tournamentFormat}>{tournamentInfo.tournamentFormat}</span>
        </div>
      </div>

      <div className={styles.bracketContent}>
        {bracketData ? (
          <div className={styles.jsonViewer}>
            <div className={styles.jsonHeader}>
              <span className={styles.jsonTitle}>Bracket Data (JSON)</span>
              <span className={styles.jsonType}>{tournamentInfo.tournamentFormat}</span>
            </div>
            <div className={styles.jsonContent}>
              {renderTournamentSpecificData()}
            </div>
          </div>
        ) : (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 2v4"/>
                <path d="M16 2v4"/>
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <path d="M3 10h18"/>
                <path d="M8 14h.01"/>
                <path d="M12 14h.01"/>
                <path d="M16 14h.01"/>
                <path d="M8 18h.01"/>
                <path d="M12 18h.01"/>
                <path d="M16 18h.01"/>
              </svg>
            </div>
            <h3 className={styles.emptyTitle}>No tournament data</h3>
            <p className={styles.emptyDescription}>
              Tournament data will appear here once a tournament is created.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BracketVisualization;
