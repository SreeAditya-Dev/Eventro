import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import EventAnalytics from "@/components/admin/EventAnalytics";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const EventAnalyticsPage = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthorization();
  }, [eventId]);

  const checkAuthorization = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error("You must be logged in to view analytics");
        navigate("/login");
        return;
      }
      
      // Get user's profile to match with organizer field
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', session.user.id)
        .single();
      
      if (profileError) {
        console.error("Error fetching profile:", profileError);
        toast.error("Failed to load profile data");
        return;
      }
      
      const fullName = `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim();
      
      // Check if user is the organizer of this event
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('organizer')
        .eq('id', eventId)
        .single();
      
      if (eventError) {
        toast.error("Event not found");
        navigate("/admin");
        return;
      }
      
      if (eventData.organizer !== fullName) {
        toast.error("You are not authorized to view analytics for this event");
        navigate("/admin");
        return;
      }
      
      setIsAuthorized(true);
    } catch (error) {
      console.error("Error:", error);
      toast.error("An unexpected error occurred");
      navigate("/admin");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container px-4 py-8">
        <div className="text-center py-12">
          <p className="text-gray-500">Checking authorization...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null; // Will redirect in the checkAuthorization function
  }

  return (
    <div className="container px-4 py-8">
      <EventAnalytics />
    </div>
  );
};

export default EventAnalyticsPage;
