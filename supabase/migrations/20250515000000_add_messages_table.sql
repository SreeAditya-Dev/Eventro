-- Create messages table for communication between organizers and attendees
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id TEXT NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Messages policies
CREATE POLICY "Messages are viewable by sender and recipient" 
ON public.messages FOR SELECT USING (
    auth.uid() = sender_id OR auth.uid() = recipient_id
);

CREATE POLICY "Messages can be created by authenticated users" 
ON public.messages FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' AND auth.uid() = sender_id
);

CREATE POLICY "Messages can be updated by recipient (for marking as read)" 
ON public.messages FOR UPDATE USING (
    auth.uid() = recipient_id
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS messages_event_id_idx ON public.messages(event_id);
CREATE INDEX IF NOT EXISTS messages_sender_id_idx ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS messages_recipient_id_idx ON public.messages(recipient_id);
CREATE INDEX IF NOT EXISTS messages_is_read_idx ON public.messages(is_read);
CREATE INDEX IF NOT EXISTS messages_created_at_idx ON public.messages(created_at);
