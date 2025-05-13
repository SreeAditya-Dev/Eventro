-- Add missing policy for inserting event paths
CREATE POLICY "Authenticated users can insert event paths" ON public.event_paths
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Add missing policy for inserting event path items
CREATE POLICY "Authenticated users can insert event path items" ON public.event_path_items
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
