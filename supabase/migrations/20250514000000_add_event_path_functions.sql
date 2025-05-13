-- Create a function to create event paths that bypasses RLS
CREATE OR REPLACE FUNCTION public.create_event_path(
    p_user_id UUID,
    p_path_name TEXT,
    p_description TEXT,
    p_skill_focus TEXT[]
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER -- This runs with the privileges of the function creator
SET search_path = public
AS $$
DECLARE
    v_path_id UUID;
BEGIN
    -- Insert the event path
    INSERT INTO public.event_paths (
        path_name,
        description,
        skill_focus,
        created_at,
        updated_at
    ) VALUES (
        p_path_name,
        p_description,
        p_skill_focus,
        NOW(),
        NOW()
    )
    RETURNING id INTO v_path_id;
    
    RETURN v_path_id;
END;
$$;

-- Create a function to add items to an event path
CREATE OR REPLACE FUNCTION public.add_event_to_path(
    p_path_id UUID,
    p_event_id TEXT,
    p_sequence_order INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER -- This runs with the privileges of the function creator
SET search_path = public
AS $$
BEGIN
    -- Insert the event path item
    INSERT INTO public.event_path_items (
        path_id,
        event_id,
        sequence_order,
        created_at
    ) VALUES (
        p_path_id,
        p_event_id,
        p_sequence_order,
        NOW()
    );
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$;

-- Grant execute permissions on the functions
GRANT EXECUTE ON FUNCTION public.create_event_path TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_event_to_path TO authenticated;
