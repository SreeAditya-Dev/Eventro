-- Drop the feedback table if it exists
DROP TABLE IF EXISTS public.feedback;

-- Create feedback table with proper references
CREATE TABLE IF NOT EXISTS public.feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id TEXT NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Policy to allow anyone to view feedback
CREATE POLICY "Feedback is viewable by everyone" 
ON public.feedback FOR SELECT USING (true);

-- Policy to allow authenticated users to create their own feedback
CREATE POLICY "Feedback can be created by authenticated users" 
ON public.feedback FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = user_id);

-- Policy to allow users to update their own feedback
CREATE POLICY "Feedback can be updated by the user who created it" 
ON public.feedback FOR UPDATE USING (auth.uid() = user_id);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS feedback_event_id_idx ON public.feedback(event_id);
CREATE INDEX IF NOT EXISTS feedback_user_id_idx ON public.feedback(user_id);
