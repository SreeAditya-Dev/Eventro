
// This file contains the recommendation engine logic
import { supabase } from "@/integrations/supabase/client";
import {
  analyzeEventDescription,
  getPersonalizedRecommendations,
  generateLearningPath,
  calculateDynamicPricing
} from "./geminiService";

// Define types
export interface UserInterest {
  category: string;
  interest_level: number;
}

export interface UserEventInteraction {
  event_id: string;
  interaction_type: string;
  created_at: string;
}

export interface EventSkill {
  event_id: string;
  skill_name: string;
  skill_level: number;
}

export interface EventPath {
  id: string;
  path_name: string;
  description: string;
  skill_focus: string[];
  events: Array<{
    id: string;
    title: string;
    description: string;
    sequence_order: number;
  }>;
}

/**
 * Track user interaction with an event
 */
export async function trackUserInteraction(userId: string, eventId: string, interactionType: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_event_interactions')
      .upsert(
        {
          user_id: userId,
          event_id: eventId,
          interaction_type: interactionType,
          created_at: new Date().toISOString()
        },
        { onConflict: 'user_id,event_id,interaction_type' }
      );

    return !error;
  } catch (error) {
    console.error('Error tracking user interaction:', error);
    return false;
  }
}

/**
 * Get user interests
 */
export async function getUserInterests(userId: string): Promise<UserInterest[]> {
  try {
    const { data, error } = await supabase
      .from('user_interests')
      .select('category, interest_level')
      .eq('user_id', userId);

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error getting user interests:', error);
    return [];
  }
}

/**
 * Update user interests
 */
export async function updateUserInterests(userId: string, interests: UserInterest[]): Promise<boolean> {
  try {
    // Convert interests to the format expected by Supabase
    const interestsWithUserId = interests.map(interest => ({
      user_id: userId,
      category: interest.category,
      interest_level: interest.interest_level,
      updated_at: new Date().toISOString()
    }));

    // Use upsert to insert or update
    const { error } = await supabase
      .from('user_interests')
      .upsert(interestsWithUserId, { onConflict: 'user_id,category' });

    return !error;
  } catch (error) {
    console.error('Error updating user interests:', error);
    return false;
  }
}

/**
 * Get user interaction history
 */
export async function getUserInteractionHistory(userId: string): Promise<UserEventInteraction[]> {
  try {
    const { data, error } = await supabase
      .from('user_event_interactions')
      .select('event_id, interaction_type, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error getting user interaction history:', error);
    return [];
  }
}

/**
 * Analyze events and extract keywords
 */
export async function analyzeAndUpdateEvents(): Promise<boolean> {
  try {
    // Get events without keywords
    const { data: events, error } = await supabase
      .from('events')
      .select('id, description, keywords')
      .is('keywords', null)
      .limit(10); // Process in batches

    if (error) {
      throw error;
    }

    // Process each event
    for (const event of events || []) {
      if (event.description) {
        const keywords = await analyzeEventDescription(event.description);

        // Update event with keywords
        const { error: updateError } = await supabase
          .from('events')
          .update({ keywords })
          .eq('id', event.id);

        if (updateError) {
          console.error(`Error updating event ${event.id} keywords:`, updateError);
        }
      }
    }

    return true;
  } catch (error) {
    console.error('Error analyzing events:', error);
    return false;
  }
}

/**
 * Get recommended events for a user
 */
export async function getRecommendedEvents(userId: string): Promise<any[]> {
  try {
    // Get user interests
    const interests = await getUserInterests(userId);
    const interestCategories = interests.map(i => i.category);

    // Get user interaction history
    const history = await getUserInteractionHistory(userId);
    const historyItems = history.map(h => ({
      eventId: h.event_id,
      type: h.interaction_type
    }));

    // Get all available events
    const { data: events, error } = await supabase
      .from('events')
      .select('*');

    if (error) {
      throw error;
    }

    // Format events
    const formattedEvents = events?.map(event => ({
      ...event,
      imageUrl: event.image_url,
      date: new Date(event.date),
      endDate: event.end_date ? new Date(event.end_date) : undefined
    })) || [];

    // Get AI recommendations
    const recommendations = await getPersonalizedRecommendations(
      userId,
      interestCategories,
      historyItems,
      formattedEvents
    );

    // Sort events based on recommendations
    const recommendationMap = new Map(recommendations.map(r => [r.eventId, r.score]));

    // If we have recommendations, filter and sort events
    if (recommendationMap.size > 0) {
      return formattedEvents
        .filter(event => recommendationMap.has(event.id))
        .sort((a, b) => {
          const scoreA = recommendationMap.get(a.id) || 0;
          const scoreB = recommendationMap.get(b.id) || 0;
          return scoreB - scoreA;
        });
    }

    // If no recommendations, return some events based on user interests
    if (interestCategories.length > 0) {
      // Return events that match user interests
      return formattedEvents
        .filter(event => interestCategories.includes(event.category))
        .slice(0, 5);
    }

    // If no interests either, return some recent events
    return formattedEvents
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  } catch (error) {
    console.error('Error getting recommended events:', error);
    return [];
  }
}

/**
 * Get event paths for a specific skill
 */
export async function getEventPathsForSkill(skill: string): Promise<EventPath[]> {
  try {
    // First check if we have existing paths
    const { data: paths, error } = await supabase
      .from('event_paths')
      .select('id, path_name, description, skill_focus')
      .contains('skill_focus', [skill]);

    if (error) {
      throw error;
    }

    if (paths && paths.length > 0) {
      // Get events for each path
      const result: EventPath[] = [];

      for (const path of paths) {
        const { data: items, error: itemsError } = await supabase
          .from('event_path_items')
          .select(`
            sequence_order,
            events (
              id,
              title,
              description
            )
          `)
          .eq('path_id', path.id)
          .order('sequence_order', { ascending: true });

        if (itemsError) {
          console.error(`Error getting events for path ${path.id}:`, itemsError);
          continue;
        }

        // Format path with events
        result.push({
          ...path,
          events: items?.map((item: any) => ({
            id: item.events.id,
            title: item.events.title,
            description: item.events.description,
            sequence_order: item.sequence_order
          })) || []
        });
      }

      return result;
    } else {
      return [];
    }
  } catch (error) {
    console.error('Error getting event paths for skill:', error);
    return [];
  }
}

/**
 * Create a new event path for a skill
 */
export async function createEventPathForSkill(userId: string, skill: string): Promise<EventPath | null> {
  try {
    // Get user interests
    const interests = await getUserInterests(userId);
    const interestCategories = interests.map(i => i.category);

    // Get all available events
    const { data: events, error } = await supabase
      .from('events')
      .select('*');

    if (error) {
      throw error;
    }

    // Format events
    const formattedEvents = events?.map(event => ({
      ...event,
      imageUrl: event.image_url,
      date: new Date(event.date),
      endDate: event.end_date ? new Date(event.end_date) : undefined
    })) || [];

    // Generate learning path
    const path = await generateLearningPath(
      userId,
      interestCategories,
      skill,
      formattedEvents
    );

    // Fallback to direct insert - we'll handle RLS errors in the UI
    const { data: pathData, error: pathError } = await supabase
      .from('event_paths')
      .insert({
        path_name: path.name,
        description: path.description,
        skill_focus: [skill]
      })
      .select()
      .single();

    if (pathError) {
      throw pathError;
    }

    // Save path items
    const pathItems = path.events.map((eventId, index) => ({
      path_id: pathData.id,
      event_id: eventId,
      sequence_order: index + 1
    }));

    const { error: itemsError } = await supabase
      .from('event_path_items')
      .insert(pathItems);

    if (itemsError) {
      throw itemsError;
    }

    // Get the complete path with events
    const completePath = await getEventPathsForSkill(skill);
    return completePath.find(p => p.id === pathData.id) || null;
  } catch (error) {
    console.error('Error creating event path for skill:', error);
    return null;
  }
}

/**
 * Get dynamic pricing for user and event
 */
export async function getDynamicPricing(userId: string, eventId: string, basePrice: number): Promise<{ discountedPrice: number, discountPercentage: number, reason: string }> {
  try {
    // Get user interaction history
    const history = await getUserInteractionHistory(userId);
    const historyItems = history.map(h => ({
      eventId: h.event_id,
      type: h.interaction_type
    }));

    // Calculate pricing
    return await calculateDynamicPricing(userId, eventId, basePrice, historyItems);
  } catch (error) {
    console.error('Error getting dynamic pricing:', error);
    return {
      discountedPrice: basePrice,
      discountPercentage: 0,
      reason: ''
    };
  }
}

/**
 * Initialize event skills (call this for each event)
 */
export async function initializeEventSkills(eventId: string, description: string): Promise<boolean> {
  try {
    // Analyze description to extract skills
    const keywords = await analyzeEventDescription(description);
    const skills = keywords.filter(k => k.toLowerCase().includes('skill') ||
                                      k.toLowerCase().includes('learn') ||
                                      k.toLowerCase().includes('development'));

    // Save skills
    if (skills.length > 0) {
      const skillEntries = skills.map(skill => ({
        event_id: eventId,
        skill_name: skill,
        skill_level: Math.floor(Math.random() * 3) + 2 // Random level between 2-5
      }));

      const { error } = await supabase
        .from('event_skills')
        .upsert(skillEntries, { onConflict: 'event_id,skill_name' });

      if (error) {
        throw error;
      }
    }

    return true;
  } catch (error) {
    console.error('Error initializing event skills:', error);
    return false;
  }
}
