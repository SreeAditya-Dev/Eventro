-- Create user_interests table to track user preferences
CREATE TABLE IF NOT EXISTS public.user_interests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    interest_level INTEGER NOT NULL DEFAULT 1, -- 1-10 scale
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, category)
);

-- Create user_event_interactions table to track user engagement with events
CREATE TABLE IF NOT EXISTS public.user_event_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    event_id TEXT NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    interaction_type TEXT NOT NULL, -- 'view', 'click', 'register', 'attend', 'favorite'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, event_id, interaction_type)
);

-- Create event_skills table to associate events with skills they help develop
CREATE TABLE IF NOT EXISTS public.event_skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id TEXT NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    skill_name TEXT NOT NULL,
    skill_level INTEGER NOT NULL DEFAULT 1, -- 1-5 scale
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_id, skill_name)
);

-- Create event_paths table for curated sequences of events
CREATE TABLE IF NOT EXISTS public.event_paths (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    path_name TEXT NOT NULL,
    description TEXT NOT NULL,
    skill_focus TEXT[] NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create event_path_items table for events in a path
CREATE TABLE IF NOT EXISTS public.event_path_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    path_id UUID NOT NULL REFERENCES public.event_paths(id) ON DELETE CASCADE,
    event_id TEXT NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    sequence_order INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(path_id, event_id),
    UNIQUE(path_id, sequence_order)
);

-- Add loyalty_discount column to events table for dynamic pricing
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS loyalty_discount INTEGER DEFAULT 0;

-- Add keywords column to events table for NLP processing
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS keywords TEXT[] DEFAULT '{}';

-- Enable Row Level Security
ALTER TABLE public.user_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_event_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_path_items ENABLE ROW LEVEL SECURITY;

-- User interests policies
CREATE POLICY "Users can view their own interests" ON public.user_interests
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own interests" ON public.user_interests
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own interests" ON public.user_interests
    FOR UPDATE USING (auth.uid() = user_id);

-- User event interactions policies
CREATE POLICY "Users can view their own interactions" ON public.user_event_interactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own interactions" ON public.user_event_interactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Event paths are public
CREATE POLICY "Event paths are viewable by all" ON public.event_paths
    FOR SELECT USING (true);

CREATE POLICY "Event path items are viewable by all" ON public.event_path_items
    FOR SELECT USING (true);

-- Event skills are public
CREATE POLICY "Event skills are viewable by all" ON public.event_skills
    FOR SELECT USING (true);
