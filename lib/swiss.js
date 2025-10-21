// Swiss tournament utilities
import { supabase } from './supabaseClient';

/**
 * Generate Swiss tournament bracket
 * @param {Array} participants - Array of participant objects
 * @returns {Object} Bracket data structure
 */
export const generateSwissBracket = (participants) => {
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
 * Handle Swiss match completion and standings update
 * @param {Object} bracketData - Current bracket data
 * @param {Object} completedMatch - The completed match
 * @param {string} winnerId - Winner's ID
 * @returns {Object} Updated bracket data
 */
export const handleSwissMatchCompletion = (bracketData, completedMatch, winnerId) => {
  if (!bracketData || !completedMatch) return bracketData;

  const updatedBracketData = { ...bracketData };
  const loserId = completedMatch.player1_id === winnerId ? completedMatch.player2_id : completedMatch.player1_id;
  
  // Update the completed match
  updatedBracketData.rounds = updatedBracketData.rounds.map(round => {
    if (round.matches) {
      return {
        ...round,
        matches: round.matches.map(match => {
          if (match.matchId === completedMatch.match_id) {
            return {
              ...match,
              winner: winnerId,
              status: 'completed'
            };
          }
          return match;
        })
      };
    }
    return round;
  });

  // Update participant stats
  updatedBracketData.participants = updatedBracketData.participants.map(participant => {
    if (participant.id === winnerId) {
      return { 
        ...participant, 
        wins: (participant.wins || 0) + 1,
        points: (participant.points || 0) + 1
      };
    } else if (participant.id === loserId) {
      return { 
        ...participant, 
        losses: (participant.losses || 0) + 1
      };
    }
    return participant;
  });

  // Check if all matches in current round are complete
  const currentRound = updatedBracketData.rounds.find(round => 
    round.roundNumber === completedMatch.round_number
  );
  
  if (currentRound && currentRound.matches.every(match => match.status === 'completed')) {
    // Generate next round pairings based on standings
    generateNextRoundPairings(updatedBracketData);
    
    // Move to next round
    updatedBracketData.currentRound = completedMatch.round_number + 1;
    
    // Check if tournament is complete
    if (updatedBracketData.currentRound > updatedBracketData.totalRounds) {
      updatedBracketData.tournamentComplete = true;
      // Determine winner based on standings
      const sortedParticipants = updatedBracketData.participants.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.wins !== a.wins) return b.wins - a.wins;
        return a.losses - b.losses;
      });
      updatedBracketData.winner = sortedParticipants[0];
    }
  }

  return updatedBracketData;
};

/**
 * Generate next round pairings based on current standings
 * @param {Object} bracketData - Current bracket data
 */
const generateNextRoundPairings = (bracketData) => {
  const currentRound = bracketData.currentRound;
  const nextRound = currentRound + 1;
  
  if (nextRound > bracketData.totalRounds) return;
  
  // Sort participants by points (descending)
  const sortedParticipants = [...bracketData.participants].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.wins !== a.wins) return b.wins - a.wins;
    return a.losses - b.losses;
  });
  
  const nextRoundMatches = [];
  const usedParticipants = new Set();
  
  // Pair participants with similar records
  for (let i = 0; i < sortedParticipants.length; i++) {
    if (usedParticipants.has(sortedParticipants[i].id)) continue;
    
    // Find best available opponent
    let opponent = null;
    for (let j = i + 1; j < sortedParticipants.length; j++) {
      if (!usedParticipants.has(sortedParticipants[j].id)) {
        opponent = sortedParticipants[j];
        break;
      }
    }
    
    if (opponent) {
      const matchId = `round${nextRound}_match${Math.floor(nextRoundMatches.length / 2) + 1}`;
      nextRoundMatches.push({
        matchId,
        player1: sortedParticipants[i],
        player2: opponent,
        winner: null,
        status: 'scheduled'
      });
      
      usedParticipants.add(sortedParticipants[i].id);
      usedParticipants.add(opponent.id);
    }
  }
  
  // Update the next round with new matches
  const nextRoundData = bracketData.rounds.find(round => round.roundNumber === nextRound);
  if (nextRoundData) {
    nextRoundData.matches = nextRoundMatches;
  }
};

/**
 * Fetch tournament participants from RSVPs
 * @param {string} eventId - Event ID
 * @param {Object} supabaseClient - Supabase client instance
 * @returns {Array} Array of participant objects
 */
export const fetchTournamentParticipants = async (eventId, supabaseClient = supabase) => {
  try {
    const { data, error } = await supabaseClient
      .from('rsvps')
      .select(`
        user_id,
        users:user_id (
          id,
          username,
          first_name,
          last_name
        )
      `)
      .eq('event_id', eventId)
      .eq('status', 'going')
      .order('created_at', { ascending: true });

    if (error) throw error;

    return (data || []).map(rsvp => ({
      id: rsvp.user_id,
      name: rsvp.users?.username || `${rsvp.users?.first_name} ${rsvp.users?.last_name}`.trim() || 'Unknown User',
      username: rsvp.users?.username,
      first_name: rsvp.users?.first_name,
      last_name: rsvp.users?.last_name
    }));
  } catch (error) {
    console.error('Error fetching tournament participants:', error);
    return [];
  }
};

/**
 * Update tournament matches in database
 * @param {string} tournamentId - Tournament ID
 * @param {Object} bracketData - Bracket data structure
 * @param {Object} supabaseClient - Supabase client instance
 */
export const updateTournamentMatches = async (tournamentId, bracketData, supabaseClient = supabase) => {
  try {
    const matches = [];
    
    bracketData.rounds.forEach(round => {
      if (round.matches) {
        round.matches.forEach(match => {
          matches.push({
            tournament_id: tournamentId,
            match_id: match.matchId,
            round_number: round.roundNumber,
            player1_id: match.player1?.id || null,
            player2_id: match.player2?.id || null,
            winner_id: match.winner || null,
            status: match.status || 'scheduled',
            match_data: {
              bracket: round.bracket || 'main',
              round_name: round.name
            }
          });
        });
      }
    });

    if (matches.length > 0) {
      const { error } = await supabaseClient
        .from('tournament_matches')
        .insert(matches);

      if (error) throw error;
    }
  } catch (error) {
    console.error('Error updating tournament matches:', error);
    throw error;
  }
};

/**
 * Clear all tournament matches
 * @param {string} tournamentId - Tournament ID
 * @param {Object} supabaseClient - Supabase client instance
 */
export const clearTournamentMatches = async (tournamentId, supabaseClient = supabase) => {
  try {
    const { error } = await supabaseClient
      .from('tournament_matches')
      .delete()
      .eq('tournament_id', tournamentId);

    if (error) throw error;
  } catch (error) {
    console.error('Error clearing tournament matches:', error);
    throw error;
  }
};

/**
 * Generate bracket data for Swiss tournament
 * @param {string} tournamentType - Type of tournament (should be 'swiss')
 * @param {Array} participants - Array of participant objects
 * @param {number} minParticipants - Minimum participants required
 * @returns {Object} Bracket data structure
 */
export const generateBracketData = (tournamentType, participants, minParticipants = 2) => {
  if (participants.length < minParticipants) {
    throw new Error(`Need at least ${minParticipants} participants. Currently have ${participants.length}.`);
  }

  if (tournamentType !== 'swiss') {
    throw new Error(`Unsupported tournament type for Swiss: ${tournamentType}`);
  }

  return generateSwissBracket(participants);
};

/**
 * Handle match completion for Swiss tournament
 * @param {Object} bracketData - Current bracket data
 * @param {Object} completedMatch - The completed match
 * @param {string} winnerId - Winner's ID
 * @param {string} tournamentType - Type of tournament
 * @returns {Object} Updated bracket data
 */
export const handleMatchCompletion = (bracketData, completedMatch, winnerId, tournamentType) => {
  if (tournamentType !== 'swiss') {
    throw new Error(`Unsupported tournament type for Swiss: ${tournamentType}`);
  }

  return handleSwissMatchCompletion(bracketData, completedMatch, winnerId);
};