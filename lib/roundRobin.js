// Round robin tournament utilities
import { supabase } from './supabaseClient';

/**
 * Generate round robin bracket
 * @param {Array} participants - Array of participant objects
 * @returns {Object} Bracket data structure
 */
export const generateRoundRobinBracket = (participants) => {
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
 * Handle round robin match completion and standings update
 * @param {Object} bracketData - Current bracket data
 * @param {Object} completedMatch - The completed match
 * @param {string} winnerId - Winner's ID
 * @returns {Object} Updated bracket data
 */
export const handleRoundRobinMatchCompletion = (bracketData, completedMatch, winnerId) => {
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
    // Move to next round
    updatedBracketData.currentRound = completedMatch.round_number + 1;
    
    // Check if tournament is complete
    if (updatedBracketData.currentRound > updatedBracketData.totalRounds) {
      updatedBracketData.tournamentComplete = true;
      // Determine winner based on standings
      const sortedParticipants = updatedBracketData.participants.sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        return b.points - a.points;
      });
      updatedBracketData.winner = sortedParticipants[0];
    }
  }

  return updatedBracketData;
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
 * Generate bracket data for round robin tournament
 * @param {string} tournamentType - Type of tournament (should be 'round_robin')
 * @param {Array} participants - Array of participant objects
 * @param {number} minParticipants - Minimum participants required
 * @returns {Object} Bracket data structure
 */
export const generateBracketData = (tournamentType, participants, minParticipants = 2) => {
  if (participants.length < minParticipants) {
    throw new Error(`Need at least ${minParticipants} participants. Currently have ${participants.length}.`);
  }

  if (tournamentType !== 'round_robin') {
    throw new Error(`Unsupported tournament type for round robin: ${tournamentType}`);
  }

  return generateRoundRobinBracket(participants);
};

/**
 * Handle match completion for round robin tournament
 * @param {Object} bracketData - Current bracket data
 * @param {Object} completedMatch - The completed match
 * @param {string} winnerId - Winner's ID
 * @param {string} tournamentType - Type of tournament
 * @returns {Object} Updated bracket data
 */
export const handleMatchCompletion = (bracketData, completedMatch, winnerId, tournamentType) => {
  if (tournamentType !== 'round_robin') {
    throw new Error(`Unsupported tournament type for round robin: ${tournamentType}`);
  }

  return handleRoundRobinMatchCompletion(bracketData, completedMatch, winnerId);
};