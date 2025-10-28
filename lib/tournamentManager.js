import { BracketsManager } from 'brackets-manager';
import { InMemoryDatabase } from 'brackets-memory-db';
import { supabase } from './supabaseClient';

class TournamentManager {
  constructor() {
    this.storage = new InMemoryDatabase();
    this.manager = new BracketsManager(this.storage);
  }

  // Load participants from RSVPs table
  async getParticipants(tournamentId) {
    const { data: tournament } = await supabase
      .from('tournaments')
      .select('event_id')
      .eq('id', tournamentId)
      .single();

    const { data: rsvps } = await supabase
      .from('rsvps')
      .select(`
        user_id,
        users!inner(first_name, last_name)
      `)
      .eq('event_id', tournament.event_id)
      .eq('status', 'going');

    return rsvps.map(rsvp => ({
      id: rsvp.user_id,
      name: `${rsvp.users.first_name} ${rsvp.users.last_name}`
    }));
  }

  // Create single elimination tournament
  async createTournament(tournamentId, tournamentName) {
    const participants = await this.getParticipants(tournamentId);
    
    if (participants.length < 2) {
      throw new Error('Need at least 2 participants');
    }

    const stage = await this.manager.create.stage({
      tournamentId: parseInt(tournamentId.replace(/-/g, '').slice(0, 8), 16),
      name: tournamentName,
      type: 'single_elimination',
      seeding: participants.map(p => p.name),
      settings: {
        seedOrdering: ['natural'],
        balanceByes: true
      }
    });

    // Get the complete bracket data from storage
    const completeBracketData = await this.manager.get.tournamentData(
      parseInt(tournamentId.replace(/-/g, '').slice(0, 8), 16)
    );

    // Save to database
    await this.saveBracketData(tournamentId, completeBracketData);
    return stage;
  }

  // Update match result
  async updateMatch(tournamentId, matchId, opponent1Score, opponent2Score) {
    const bracketData = await this.loadBracketData(tournamentId);
    
    // Load bracket into memory
    await this.loadBracketIntoMemory(bracketData);

    const match = await this.manager.update.match({
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
    const completeBracketData = await this.manager.get.tournamentData(
      parseInt(tournamentId.replace(/-/g, '').slice(0, 8), 16)
    );

    // Save updated bracket
    await this.saveBracketData(tournamentId, completeBracketData);
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
      
      await this.loadBracketIntoMemory(bracketData);
      
      return await this.manager.get.currentMatches(
        parseInt(tournamentId.replace(/-/g, '').slice(0, 8), 16)
      );
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

  // Load bracket into memory storage
  async loadBracketIntoMemory(bracketData) {
    // Clear existing data
    this.storage.reset();
    
    // Load tournament data
    if (bracketData && bracketData.bracketViewerData) {
      const data = bracketData.bracketViewerData;
      
      // Load participants
      if (data.participant) {
        for (const participant of data.participant) {
          await this.storage.insert.participant(participant);
        }
      }
      
      // Load stages
      if (data.stage) {
        for (const stage of data.stage) {
          await this.storage.insert.stage(stage);
        }
      }
      
      // Load groups
      if (data.group) {
        for (const group of data.group) {
          await this.storage.insert.group(group);
        }
      }
      
      // Load rounds
      if (data.round) {
        for (const round of data.round) {
          await this.storage.insert.round(round);
        }
      }
      
      // Load matches
      if (data.match) {
        for (const match of data.match) {
          await this.storage.insert.match(match);
        }
      }
    }
  }
}

export default new TournamentManager();
