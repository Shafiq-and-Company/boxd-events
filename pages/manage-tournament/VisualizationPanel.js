import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import styles from './VisualizationPanel.module.css';

const VisualizationPanel = ({ eventData, participants, refreshTrigger }) => {
  const [tournamentData, setTournamentData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchTournamentData = async () => {
    if (!eventData?.id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .eq('event_id', eventData.id)
        .single();

      if (error) throw error;
      setTournamentData(data);
    } catch (err) {
      console.error('Error fetching tournament data:', err);
      setError('Failed to load tournament data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTournamentData();
  }, [eventData?.id, refreshTrigger]);

  const renderBracket = () => {
    if (!tournamentData?.bracket_data) {
      return (
        <div className={styles.noBracketData}>
          <p>No tournament bracket data available</p>
          <p>Configure and start the tournament to see the bracket</p>
        </div>
      );
    }

    const { tournament_type } = tournamentData;
    const bracketData = tournamentData.bracket_data;

    switch (tournament_type) {
      case 'single_elimination':
        return <SingleEliminationBracket bracketData={bracketData} />;
      case 'double_elimination':
        return <DoubleEliminationBracket bracketData={bracketData} />;
      case 'round_robin':
        return <RoundRobinBracket bracketData={bracketData} />;
      case 'swiss':
        return <SwissBracket bracketData={bracketData} />;
      default:
        return <div className={styles.unsupportedFormat}>Unsupported tournament format</div>;
    }
  };

  if (loading) {
    return (
      <div className={styles.visualizationPanel}>
        <div className={styles.panelContent}>
          <h2 className={styles.panelTitle}>Visualization</h2>
          <div className={styles.loading}>Loading tournament data...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.visualizationPanel}>
        <div className={styles.panelContent}>
          <h2 className={styles.panelTitle}>Visualization</h2>
          <div className={styles.error}>{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.visualizationPanel}>
      <div className={styles.panelContent}>
        <h2 className={styles.panelTitle}>Tournament Bracket</h2>
        {renderBracket()}
      </div>
    </div>
  );
};

// Single Elimination Bracket Component
const SingleEliminationBracket = ({ bracketData }) => {
  if (!bracketData?.rounds) return <div>No bracket data available</div>;

  return (
    <div className={styles.singleEliminationBracket}>
      {bracketData.rounds.map((round, roundIndex) => (
        <div key={roundIndex} className={styles.round}>
          <div className={styles.roundHeader}>
            <h3>Round {round.roundNumber}</h3>
          </div>
          <div className={styles.matches}>
            {round.matches.map((match, matchIndex) => (
              <div key={matchIndex} className={styles.match}>
                <div className={styles.matchHeader}>
                  <span className={styles.matchId}>{match.matchId}</span>
                  <span className={`${styles.matchStatus} ${styles[match.status]}`}>
                    {match.status}
                  </span>
                </div>
                <div className={styles.players}>
                  <div className={`${styles.player} ${match.winner === match.player1?.id ? styles.winner : ''}`}>
                    <span className={styles.playerName}>{match.player1?.name || 'TBD'}</span>
                    <span className={styles.playerSeed}>#{match.player1?.seed || ''}</span>
                  </div>
                  <div className={styles.vs}>VS</div>
                  <div className={`${styles.player} ${match.winner === match.player2?.id ? styles.winner : ''}`}>
                    <span className={styles.playerName}>{match.player2?.name || 'TBD'}</span>
                    <span className={styles.playerSeed}>#{match.player2?.seed || ''}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

// Double Elimination Bracket Component
const DoubleEliminationBracket = ({ bracketData }) => {
  if (!bracketData?.rounds) return <div>No bracket data available</div>;

  const winnersRounds = bracketData.rounds.filter(round => 
    round.matches.some(match => match.matchId.includes('winners'))
  );
  const losersRounds = bracketData.rounds.filter(round => 
    round.matches.some(match => match.matchId.includes('losers'))
  );
  const grandFinals = bracketData.rounds.filter(round => 
    round.matches.some(match => match.matchId.includes('grand_finals'))
  );

  return (
    <div className={styles.doubleEliminationBracket}>
      <div className={styles.bracketSection}>
        <h3 className={styles.sectionTitle}>Winners Bracket</h3>
        {winnersRounds.map((round, roundIndex) => (
          <div key={roundIndex} className={styles.round}>
            <div className={styles.roundHeader}>
              <h4>Round {round.roundNumber}</h4>
            </div>
            <div className={styles.matches}>
              {round.matches.map((match, matchIndex) => (
                <div key={matchIndex} className={styles.match}>
                  <div className={styles.matchHeader}>
                    <span className={styles.matchId}>{match.matchId}</span>
                    <span className={`${styles.matchStatus} ${styles[match.status]}`}>
                      {match.status}
                    </span>
                  </div>
                  <div className={styles.players}>
                    <div className={`${styles.player} ${match.winner === match.player1?.id ? styles.winner : ''}`}>
                      <span className={styles.playerName}>{match.player1?.name || 'TBD'}</span>
                      <span className={styles.playerSeed}>#{match.player1?.seed || ''}</span>
                    </div>
                    <div className={styles.vs}>VS</div>
                    <div className={`${styles.player} ${match.winner === match.player2?.id ? styles.winner : ''}`}>
                      <span className={styles.playerName}>{match.player2?.name || 'TBD'}</span>
                      <span className={styles.playerSeed}>#{match.player2?.seed || ''}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className={styles.bracketSection}>
        <h3 className={styles.sectionTitle}>Losers Bracket</h3>
        {losersRounds.map((round, roundIndex) => (
          <div key={roundIndex} className={styles.round}>
            <div className={styles.roundHeader}>
              <h4>Round {round.roundNumber}</h4>
            </div>
            <div className={styles.matches}>
              {round.matches.map((match, matchIndex) => (
                <div key={matchIndex} className={styles.match}>
                  <div className={styles.matchHeader}>
                    <span className={styles.matchId}>{match.matchId}</span>
                    <span className={`${styles.matchStatus} ${styles[match.status]}`}>
                      {match.status}
                    </span>
                  </div>
                  <div className={styles.players}>
                    <div className={`${styles.player} ${match.winner === match.player1?.id ? styles.winner : ''}`}>
                      <span className={styles.playerName}>{match.player1?.name || 'TBD'}</span>
                      <span className={styles.playerSeed}>#{match.player1?.seed || ''}</span>
                    </div>
                    <div className={styles.vs}>VS</div>
                    <div className={`${styles.player} ${match.winner === match.player2?.id ? styles.winner : ''}`}>
                      <span className={styles.playerName}>{match.player2?.name || 'TBD'}</span>
                      <span className={styles.playerSeed}>#{match.player2?.seed || ''}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {grandFinals.length > 0 && (
        <div className={styles.bracketSection}>
          <h3 className={styles.sectionTitle}>Grand Finals</h3>
          {grandFinals.map((round, roundIndex) => (
            <div key={roundIndex} className={styles.round}>
              <div className={styles.roundHeader}>
                <h4>Grand Finals</h4>
              </div>
              <div className={styles.matches}>
                {round.matches.map((match, matchIndex) => (
                  <div key={matchIndex} className={styles.match}>
                    <div className={styles.matchHeader}>
                      <span className={styles.matchId}>{match.matchId}</span>
                      <span className={`${styles.matchStatus} ${styles[match.status]}`}>
                        {match.status}
                      </span>
                    </div>
                    <div className={styles.players}>
                      <div className={`${styles.player} ${match.winner === match.player1?.id ? styles.winner : ''}`}>
                        <span className={styles.playerName}>{match.player1?.name || 'TBD'}</span>
                        <span className={styles.playerSeed}>#{match.player1?.seed || ''}</span>
                      </div>
                      <div className={styles.vs}>VS</div>
                      <div className={`${styles.player} ${match.winner === match.player2?.id ? styles.winner : ''}`}>
                        <span className={styles.playerName}>{match.player2?.name || 'TBD'}</span>
                        <span className={styles.playerSeed}>#{match.player2?.seed || ''}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Round Robin Bracket Component
const RoundRobinBracket = ({ bracketData }) => {
  if (!bracketData?.rounds) return <div>No bracket data available</div>;

  return (
    <div className={styles.roundRobinBracket}>
      {bracketData.rounds.map((round, roundIndex) => (
        <div key={roundIndex} className={styles.round}>
          <div className={styles.roundHeader}>
            <h3>Round {round.roundNumber}</h3>
          </div>
          <div className={styles.matches}>
            {round.matches.map((match, matchIndex) => (
              <div key={matchIndex} className={styles.match}>
                <div className={styles.matchHeader}>
                  <span className={styles.matchId}>{match.matchId}</span>
                  <span className={`${styles.matchStatus} ${styles[match.status]}`}>
                    {match.status}
                  </span>
                </div>
                <div className={styles.players}>
                  <div className={`${styles.player} ${match.winner === match.player1?.id ? styles.winner : ''}`}>
                    <span className={styles.playerName}>{match.player1?.name || 'TBD'}</span>
                    <span className={styles.playerSeed}>#{match.player1?.seed || ''}</span>
                  </div>
                  <div className={styles.vs}>VS</div>
                  <div className={`${styles.player} ${match.winner === match.player2?.id ? styles.winner : ''}`}>
                    <span className={styles.playerName}>{match.player2?.name || 'TBD'}</span>
                    <span className={styles.playerSeed}>#{match.player2?.seed || ''}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

// Swiss Bracket Component
const SwissBracket = ({ bracketData }) => {
  if (!bracketData?.rounds) return <div>No bracket data available</div>;

  return (
    <div className={styles.swissBracket}>
      {bracketData.rounds.map((round, roundIndex) => (
        <div key={roundIndex} className={styles.round}>
          <div className={styles.roundHeader}>
            <h3>Round {round.roundNumber}</h3>
          </div>
          <div className={styles.matches}>
            {round.matches.map((match, matchIndex) => (
              <div key={matchIndex} className={styles.match}>
                <div className={styles.matchHeader}>
                  <span className={styles.matchId}>{match.matchId}</span>
                  <span className={`${styles.matchStatus} ${styles[match.status]}`}>
                    {match.status}
                  </span>
                </div>
                <div className={styles.players}>
                  <div className={`${styles.player} ${match.winner === match.player1?.id ? styles.winner : ''}`}>
                    <span className={styles.playerName}>{match.player1?.name || 'TBD'}</span>
                    <span className={styles.playerSeed}>#{match.player1?.seed || ''}</span>
                  </div>
                  <div className={styles.vs}>VS</div>
                  <div className={`${styles.player} ${match.winner === match.player2?.id ? styles.winner : ''}`}>
                    <span className={styles.playerName}>{match.player2?.name || 'TBD'}</span>
                    <span className={styles.playerSeed}>#{match.player2?.seed || ''}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default VisualizationPanel;
