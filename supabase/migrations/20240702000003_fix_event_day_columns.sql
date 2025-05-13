-- Add event_id column to distributions table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'distributions' AND column_name = 'event_id'
    ) THEN
        ALTER TABLE public.distributions ADD COLUMN event_id TEXT REFERENCES public.events(id);
    END IF;
END $$;

-- Add event_day column to distributions table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'distributions' AND column_name = 'event_day'
    ) THEN
        ALTER TABLE public.distributions ADD COLUMN event_day INTEGER DEFAULT 1;
    END IF;
END $$;

-- Add distributed_by column to distributions table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'distributions' AND column_name = 'distributed_by'
    ) THEN
        ALTER TABLE public.distributions ADD COLUMN distributed_by UUID REFERENCES auth.users(id);
    END IF;
END $$;

-- Add event_day column to event_check_ins table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'event_check_ins' AND column_name = 'event_day'
    ) THEN
        ALTER TABLE public.event_check_ins ADD COLUMN event_day INTEGER DEFAULT 1;
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS distributions_event_id_idx ON public.distributions(event_id);
CREATE INDEX IF NOT EXISTS distributions_event_day_idx ON public.distributions(event_day);
CREATE INDEX IF NOT EXISTS event_check_ins_event_day_idx ON public.event_check_ins(event_day);
