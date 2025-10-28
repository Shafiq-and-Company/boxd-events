import { BracketsManager } from 'brackets-manager';
import { InMemoryDatabase } from 'brackets-memory-db';
import { supabase } from './supabaseClient';

class TournamentManager {
  constructor() {
    this.storage = new InMemoryDatabase();
    this.manager = new BracketsManager(this.storage);
  }

  // Check if tournament needs to be regenerated (when participants are added)
  async checkAndRegenerateTournament(tournamentId) {
    const participants = await this.getParticipants(tournamentId);
    
    // Get current tournament status
    const { data: tournament } = await supabase
      .from('tournaments')
      .select('status, bracket_data')
      .eq('id', tournamentId)
      .single();
    
    // If tournament is waiting for participants and we now have enough, regenerate
    if (tournament.status === 'waiting_for_participants' && participants.length >= 2) {
      console.log(`Regenerating tournament ${tournamentId} with ${participants.length} participants`);
      
      // Get tournament name for regeneration
      const { data: tournamentInfo } = await supabase
        .from('tournaments')
        .select('name')
        .eq('id', tournamentId)
        .single();
      
      // Regenerate the tournament
      return await this.createTournament(tournamentId, tournamentInfo.name);
    }
    
    return null;
  }

  // Load participants from RSVPs table
  async getParticipants(tournamentId) {
    const { data: tournament } = await supabase
      .from('tournaments')
      .select('event_id, events!inner(host_id)')
      .eq('id', tournamentId)
      .single();

    const { data: rsvps } = await supabase
      .from('rsvps')
      .select(`
        user_id,
        users!inner(username, first_name, last_name)
      `)
      .eq('event_id', tournament.event_id)
      .eq('status', 'going');

    // Get RSVP participants
    const rsvpParticipants = rsvps.map(rsvp => ({
      id: rsvp.user_id,
      name: rsvp.users.username,
      firstName: rsvp.users.first_name,
      lastName: rsvp.users.last_name
    }));

    // Check if host is already in RSVPs
    const hostInRsvps = rsvpParticipants.some(p => p.id === tournament.events.host_id);
    
    // If host is not in RSVPs, add them as a participant
    if (!hostInRsvps && tournament.events.host_id) {
      const { data: hostUser } = await supabase
        .from('users')
        .select('username, first_name, last_name')
        .eq('id', tournament.events.host_id)
        .single();
      
      if (hostUser) {
        rsvpParticipants.unshift({
          id: tournament.events.host_id,
          name: hostUser.username,
          firstName: hostUser.first_name,
          lastName: hostUser.last_name,
          isHost: true
        });
      }
    }

    return rsvpParticipants;
  }

  // Create single elimination tournament
  async createTournament(tournamentId, tournamentName) {
    const participants = await this.getParticipants(tournamentId);
    
    if (participants.length < 2) {
      // If not enough participants, still create the tournament structure
      // but mark it as waiting for participants
      await supabase
        .from('tournaments')
        .update({ 
          status: 'waiting_for_participants',
          bracket_data: { message: 'Waiting for at least 2 participants to generate matches' }
        })
        .eq('id', tournamentId);
      
      return null; // Return null to indicate no bracket was created yet
    }

    // Calculate the next power of 2 and number of BYEs needed
    const nextPowerOfTwo = Math.pow(2, Math.ceil(Math.log2(participants.length)));
    const byesNeeded = nextPowerOfTwo - participants.length;
    
    // Create seeding array with BYE participants
    const seeding = [];
    
    // Add real participants
    participants.forEach(participant => {
      seeding.push(participant.name);
    });
    
    // Add BYE participants to reach power of 2
    for (let i = 0; i < byesNeeded; i++) {
      seeding.push(null); // null represents a BYE
    }

    const stage = await this.manager.create.stage({
      tournamentId: parseInt(tournamentId.replace(/-/g, '').slice(0, 8), 16),
      name: tournamentName,
      type: 'single_elimination',
      seeding: seeding,
      settings: {
        seedOrdering: ['natural'],
        balanceByes: true
      }
    });

    // Get the complete bracket data from storage
    const completeBracketData = await this.manager.get.tournamentData(
      parseInt(tournamentId.replace(/-/g, '').slice(0, 8), 16)
    );

    console.log('Tournament created successfully:', {
      tournamentId,
      participantCount: participants.length,
      stageCount: completeBracketData.stage?.length || 0,
      matchCount: completeBracketData.match?.length || 0,
      participantDataCount: completeBracketData.participant?.length || 0
    });

    // Update tournament status to active and save bracket data with proper structure
    await supabase
      .from('tournaments')
      .update({ 
        status: 'active',
        bracket_data: { 
          bracketViewerData: completeBracketData 
        }
      })
      .eq('id', tournamentId);

    return stage;
  }

  // Update match result
  async updateMatch(tournamentId, matchId, opponent1Score, opponent2Score) {
    // Create a fresh manager instance with the bracket data
    const storage = new InMemoryDatabase();
    const manager = new BracketsManager(storage);
    
    const bracketData = await this.loadBracketData(tournamentId);
    
    if (!bracketData || !bracketData.bracketViewerData) {
      throw new Error('No bracket data found');
    }

    // Load the bracket data into the fresh storage
    const data = bracketData.bracketViewerData;
    
    // Populate the storage with the bracket data
    for (const table of ['participant', 'stage', 'group', 'round', 'match', 'match_game']) {
      if (data[table]) {
        for (const item of data[table]) {
          await storage.insert(table, item);
        }
      }
    }

    // Update the match
    const match = await manager.update.match({
      id: matchId,
      opponent1: {
        score: opponent1Score,
        result: opponent1Score > opponent2Score ? 'win' : 'loss'
      },
      opponent2: {
        score: opponent2Score,
        result: opponent2Score > opponent1Score ? 'win' : 'loss'
      }
    });

    // Get the complete updated bracket data from storage
    const completeBracketData = await manager.get.tournamentData(
      parseInt(tournamentId.replace(/-/g, '').slice(0, 8), 16)
    );

    // Save updated bracket with proper structure
    await this.saveBracketData(tournamentId, { 
      bracketViewerData: completeBracketData 
    });
    return match;
  }

  // Get current matches
  async getCurrentMatches(tournamentId) {
    try {
      const bracketData = await this.loadBracketData(tournamentId);
      
      // If no bracket data exists yet, return empty array
      if (!bracketData || !bracketData.bracketViewerData) {
        return [];
      }
      
      const data = bracketData.bracketViewerData;
      
      // Filter matches that are ready to play (status 2) or in progress (status 3)
      // Status: 0 = locked, 1 = waiting, 2 = ready, 3 = running, 4 = completed
      const matches = data.match || [];
      const currentMatches = matches.filter(match => 
        match.status === 2 || match.status === 3
      );
      
      // Enrich matches with participant names
      const participants = data.participant || [];
      const participantMap = {};
      participants.forEach(p => {
        participantMap[p.id] = p;
      });
      
      return currentMatches.map(match => ({
        ...match,
        opponent1: match.opponent1 ? {
          ...match.opponent1,
          name: participantMap[match.opponent1.id]?.name || 'Unknown'
        } : null,
        opponent2: match.opponent2 ? {
          ...match.opponent2,
          name: participantMap[match.opponent2.id]?.name || 'Unknown'
        } : null
      }));
    } catch (error) {
      console.error('Error getting current matches:', error);
      return [];
    }
  }

  // Get bracket data for visualization
  async getBracketData(tournamentId) {
    try {
      const bracketData = await this.loadBracketData(tournamentId);
      return bracketData.bracketViewerData || null;
    } catch (error) {
      console.error('Error getting bracket data:', error);
      return null;
    }
  }

  // Save bracket data to database
  async saveBracketData(tournamentId, bracketData) {
    const { error } = await supabase
      .from('tournaments')
      .update({ bracket_data: bracketData })
      .eq('id', tournamentId);

    if (error) throw error;
  }

  // Load bracket data from database
  async loadBracketData(tournamentId) {
    const { data, error } = await supabase
      .from('tournaments')
      .select('bracket_data')
      .eq('id', tournamentId)
      .single();

    if (error) throw error;
    
    // Return empty object if bracket_data is null or empty
    return data.bracket_data || {};
  }

  // Reset tournament - regenerates bracket to initial state with current participants
  async resetTournament(tournamentId) {
    // Get tournament info
    const { data: tournament, error: tournamentError } = await supabase
      .from('tournaments')
      .select('name')
      .eq('id', tournamentId)
      .single();

    if (tournamentError) throw tournamentError;
    
    // Clear in-memory storage
    this.storage = new InMemoryDatabase();
    this.manager = new BracketsManager(this.storage);
    
    // Regenerate the tournament with current participants
    await this.createTournament(tournamentId, tournament.name);
    
    return true;
  }
}

export default new TournamentManager();
