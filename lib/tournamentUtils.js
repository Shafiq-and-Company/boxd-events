// Tournament utility functions for bracket generation and management

/**
 * Generate bracket data for different tournament types
 * @param {string} tournamentType - Type of tournament (single_elimination, double_elimination, round_robin, swiss)
 * @param {Array} participants - Array of participant objects
 * @param {number} minParticipants - Minimum participants required
 * @returns {Object} Bracket data structure
 */
export const generateBracketData = (tournamentType, participants, minParticipants) => {
  if (!participants || participants.length < minParticipants) {
    return {
      rounds: [],
      participants: participants || [],
      currentRound: 0,
      totalRounds: 0,
      tournamentType: tournamentType
    };
  }

  switch (tournamentType) {
    case 'single_elimination':
      return generateSingleEliminationBracket(participants);
    case 'double_elimination':
      return generateDoubleEliminationBracket(participants);
    case 'round_robin':
      return generateRoundRobinBracket(participants);
    case 'swiss':
      return generateSwissBracket(participants);
    default:
      return generateSingleEliminationBracket(participants);
  }
};

/**
 * Generate single elimination bracket
 */
const generateSingleEliminationBracket = (participants) => {
  const numParticipants = participants.length;
  const totalRounds = Math.ceil(Math.log2(numParticipants));
  
  // Create rounds array
  const rounds = [];
  
  // First round - all participants
  const firstRoundMatches = [];
  for (let i = 0; i < numParticipants; i += 2) {
    const matchId = `round1_match${Math.floor(i / 2) + 1}`;
    firstRoundMatches.push({
      matchId,
      player1: participants[i] || null,
      player2: participants[i + 1] || null,
      player1Score: 0,
      player2Score: 0,
      winner: null,
      status: 'scheduled'
    });
  }
  
  rounds.push({
    roundNumber: 1,
    name: 'Round 1',
    matches: firstRoundMatches
  });

  // Generate subsequent rounds
  for (let round = 2; round <= totalRounds; round++) {
    const prevRoundMatches = rounds[round - 2].matches;
    const currentRoundMatches = [];
    
    for (let i = 0; i < prevRoundMatches.length / 2; i++) {
      const matchId = `round${round}_match${i + 1}`;
      currentRoundMatches.push({
        matchId,
        player1: null, // Will be filled by winners
        player2: null,
        player1Score: 0,
        player2Score: 0,
        winner: null,
        status: 'scheduled'
      });
    }
    
    rounds.push({
      roundNumber: round,
      name: round === totalRounds ? 'Finals' : `Round ${round}`,
      matches: currentRoundMatches
    });
  }

  return {
    rounds,
    participants: participants.map((p, index) => ({
      ...p,
      seed: index + 1,
      eliminated: false
    })),
    currentRound: 1,
    totalRounds,
    tournamentType: 'single_elimination'
  };
};

/**
 * Generate double elimination bracket
 */
const generateDoubleEliminationBracket = (participants) => {
  const numParticipants = participants.length;
  const totalRounds = Math.ceil(Math.log2(numParticipants)) * 2 - 1;
  
  const rounds = [];
  
  // Winners bracket - first round
  const winnersFirstRound = [];
  for (let i = 0; i < numParticipants; i += 2) {
    const matchId = `winners_round1_match${Math.floor(i / 2) + 1}`;
    winnersFirstRound.push({
      matchId,
      player1: participants[i] || null,
      player2: participants[i + 1] || null,
      player1Score: 0,
      player2Score: 0,
      winner: null,
      status: 'scheduled'
    });
  }
  
  rounds.push({
    roundNumber: 1,
    name: 'Winners Round 1',
    bracket: 'winners',
    matches: winnersFirstRound
  });

  // Losers bracket - first round (will be populated as players lose)
  rounds.push({
    roundNumber: 1,
    name: 'Losers Round 1',
    bracket: 'losers',
    matches: []
  });

  // Grand finals
  rounds.push({
    roundNumber: totalRounds,
    name: 'Grand Finals',
    bracket: 'grand_finals',
    matches: [{
      matchId: 'grand_finals_match1',
      player1: null,
      player2: null,
      player1Score: 0,
      player2Score: 0,
      winner: null,
      status: 'scheduled'
    }]
  });

  return {
    rounds,
    participants: participants.map((p, index) => ({
      ...p,
      seed: index + 1,
      eliminated: false,
      losses: 0
    })),
    currentRound: 1,
    totalRounds,
    tournamentType: 'double_elimination'
  };
};

/**
 * Generate round robin bracket
 */
const generateRoundRobinBracket = (participants) => {
  const numParticipants = participants.length;
  const totalRounds = numParticipants - 1;
  
  const rounds = [];
  
  // Generate all possible matchups
  const allMatches = [];
  for (let i = 0; i < numParticipants; i++) {
    for (let j = i + 1; j < numParticipants; j++) {
      allMatches.push({
        player1: participants[i],
        player2: participants[j],
        player1Score: 0,
        player2Score: 0,
        winner: null,
        status: 'scheduled'
      });
    }
  }
  
  // Distribute matches across rounds
  for (let round = 1; round <= totalRounds; round++) {
    const roundMatches = [];
    const matchesPerRound = Math.floor(numParticipants / 2);
    
    for (let i = 0; i < matchesPerRound; i++) {
      const matchIndex = (round - 1) * matchesPerRound + i;
      if (matchIndex < allMatches.length) {
        const match = allMatches[matchIndex];
        roundMatches.push({
          matchId: `round${round}_match${i + 1}`,
          ...match,
          status: 'scheduled'
        });
      }
    }
    
    rounds.push({
      roundNumber: round,
      name: `Round ${round}`,
      matches: roundMatches
    });
  }

  return {
    rounds,
    participants: participants.map((p, index) => ({
      ...p,
      seed: index + 1,
      wins: 0,
      losses: 0,
      points: 0
    })),
    currentRound: 1,
    totalRounds,
    tournamentType: 'round_robin'
  };
};

/**
 * Generate Swiss tournament bracket
 */
const generateSwissBracket = (participants) => {
  const numParticipants = participants.length;
  const totalRounds = Math.ceil(Math.log2(numParticipants));
  
  const rounds = [];
  
  // First round - random pairings
  const firstRoundMatches = [];
  const shuffledParticipants = [...participants].sort(() => Math.random() - 0.5);
  
  for (let i = 0; i < numParticipants; i += 2) {
    const matchId = `round1_match${Math.floor(i / 2) + 1}`;
    firstRoundMatches.push({
      matchId,
      player1: shuffledParticipants[i] || null,
      player2: shuffledParticipants[i + 1] || null,
      player1Score: 0,
      player2Score: 0,
      winner: null,
      status: 'scheduled'
    });
  }
  
  rounds.push({
    roundNumber: 1,
    name: 'Round 1',
    matches: firstRoundMatches
  });

  // Subsequent rounds will be generated based on standings
  for (let round = 2; round <= totalRounds; round++) {
    rounds.push({
      roundNumber: round,
      name: `Round ${round}`,
      matches: [] // Will be populated based on previous round results
    });
  }

  return {
    rounds,
    participants: participants.map((p, index) => ({
      ...p,
      seed: index + 1,
      wins: 0,
      losses: 0,
      draws: 0,
      points: 0
    })),
    currentRound: 1,
    totalRounds,
    tournamentType: 'swiss'
  };
};

/**
 * Update tournament matches in the database
 * @param {string} tournamentId - Tournament ID
 * @param {Object} bracketData - New bracket data
 * @param {Object} supabase - Supabase client
 */
export const updateTournamentMatches = async (tournamentId, bracketData, supabase) => {
  try {
    // Note: Matches should already be cleared by clearTournamentMatches() before calling this function

    // Create new matches from bracket data
    const matchesToInsert = [];
    
    bracketData.rounds.forEach(round => {
      round.matches.forEach(match => {
        matchesToInsert.push({
          tournament_id: tournamentId,
          match_id: match.matchId,
          round_number: round.roundNumber,
          player1_id: match.player1?.id || null,
          player2_id: match.player2?.id || null,
          player1_score: match.player1Score || 0,
          player2_score: match.player2Score || 0,
          winner_id: match.winner?.id || null,
          status: match.status || 'scheduled',
          match_data: {
            bracket: round.bracket || 'main',
            player1_name: match.player1?.name || null,
            player2_name: match.player2?.name || null
          }
        });
      });
    });

    if (matchesToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('tournament_matches')
        .insert(matchesToInsert);

      if (insertError) {
        console.error('Error inserting new matches:', insertError);
        throw insertError;
      }
    }

    console.log(`Successfully updated ${matchesToInsert.length} tournament matches`);
  } catch (error) {
    console.error('Error updating tournament matches:', error);
    throw error;
  }
};

/**
 * Clear all tournament matches for a tournament
 * @param {string} tournamentId - Tournament ID
 * @param {Object} supabase - Supabase client
 */
export const clearTournamentMatches = async (tournamentId, supabase) => {
  try {
    const { error } = await supabase
      .from('tournament_matches')
      .delete()
      .eq('tournament_id', tournamentId);

    if (error) {
      console.error('Error clearing tournament matches:', error);
      throw error;
    }

    console.log(`Successfully cleared all matches for tournament ${tournamentId}`);
  } catch (error) {
    console.error('Error clearing tournament matches:', error);
    throw error;
  }
};

/**
 * Fetch participants for a tournament from RSVPs
 * @param {string} eventId - Event ID
 * @param {Object} supabase - Supabase client
 * @returns {Array} Array of participant objects
 */
export const fetchTournamentParticipants = async (eventId, supabase) => {
  try {
    const { data: rsvps, error } = await supabase
      .from('rsvps')
      .select(`
        user_id,
        users!inner(
          id,
          first_name,
          last_name,
          username
        )
      `)
      .eq('event_id', eventId)
      .eq('status', 'going');

    if (error) {
      console.error('Error fetching participants:', error);
      return [];
    }

    return rsvps.map(rsvp => ({
      id: rsvp.user_id,
      name: rsvp.users.username || `${rsvp.users.first_name} ${rsvp.users.last_name}`,
      first_name: rsvp.users.first_name,
      last_name: rsvp.users.last_name,
      username: rsvp.users.username
    }));
  } catch (error) {
    console.error('Error fetching tournament participants:', error);
    return [];
  }
};
