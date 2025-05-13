-- Create event_days table to track multi-day events
CREATE TABLE IF NOT EXISTS public.event_days (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id TEXT NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    day_number INTEGER NOT NULL,
    day_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_id, day_number)
);

-- Create feedback table
CREATE TABLE IF NOT EXISTS public.feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id TEXT NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add distributed_by column to distributions table
ALTER TABLE public.distributions 
ADD COLUMN IF NOT EXISTS distributed_by UUID REFERENCES auth.users(id);

-- Add event_id column to distributions table
ALTER TABLE public.distributions 
ADD COLUMN IF NOT EXISTS event_id TEXT REFERENCES public.events(id);

-- Add event_day column to event_check_ins table
ALTER TABLE public.event_check_ins 
ADD COLUMN IF NOT EXISTS event_day INTEGER DEFAULT 1;

-- Create notifications table for confirmation messages
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    event_id TEXT NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'registration', 'check_in', 'distribution'
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create RLS policies for the new tables
ALTER TABLE public.event_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Event days policies
CREATE POLICY "Event days are viewable by everyone" 
ON public.event_days FOR SELECT USING (true);

CREATE POLICY "Event days can be created by authenticated users" 
ON public.event_days FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Event days can be updated by event organizers" 
ON public.event_days FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM public.events e 
        WHERE e.id = event_id AND e.organizer = (
            SELECT concat(p.first_name, ' ', p.last_name) 
            FROM public.profiles p 
            WHERE p.id = auth.uid()
        )
    )
);

-- Feedback policies
CREATE POLICY "Feedback is viewable by everyone" 
ON public.feedback FOR SELECT USING (true);

CREATE POLICY "Feedback can be created by authenticated users" 
ON public.feedback FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = user_id);

CREATE POLICY "Feedback can be updated by the user who created it" 
ON public.feedback FOR UPDATE USING (auth.uid() = user_id);

-- Notifications policies
CREATE POLICY "Notifications are viewable by the user they belong to" 
ON public.notifications FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Notifications can be created by authenticated users" 
ON public.notifications FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Notifications can be updated by the user they belong to" 
ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
