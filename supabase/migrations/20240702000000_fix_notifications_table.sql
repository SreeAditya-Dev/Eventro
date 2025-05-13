-- Drop the notifications table if it exists
DROP TABLE IF EXISTS public.notifications;

-- Create notifications table with proper references
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    event_id TEXT NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'registration', 'check_in', 'distribution', 'feedback'
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Policy to allow users to view their own notifications
CREATE POLICY "Notifications are viewable by the user they belong to" 
ON public.notifications FOR SELECT USING (auth.uid() = user_id);

-- Policy to allow authenticated users to create notifications
CREATE POLICY "Notifications can be created by authenticated users" 
ON public.notifications FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Policy to allow users to update their own notifications (e.g., mark as read)
CREATE POLICY "Notifications can be updated by the user they belong to" 
ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_event_id_idx ON public.notifications(event_id);
CREATE INDEX IF NOT EXISTS notifications_is_read_idx ON public.notifications(is_read);
