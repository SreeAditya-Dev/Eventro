
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import EventActivities from "./EventActivities";
import EventFinancials from "./EventFinancials";
import EventCalendar from "./EventCalendar";
import DashboardAnalytics from "./DashboardAnalytics";

const Dashboard = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<string>("");
  const navigate = useNavigate();

  useEffect(() => {
    fetchUserEvents();
  }, []);

  const fetchUserEvents = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error("You must be logged in to view your events");
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
      
      // Fetch events created by this user only
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('organizer', fullName)
        .order('date', { ascending: false });
      
      if (error) {
        console.error("Error fetching events:", error);
        toast.error("Failed to load events");
        return;
      }
      
      setEvents(data || []);
      
      // Set the first event as selected if events exist
      if (data && data.length > 0) {
        setSelectedEvent(data[0].id);
      }
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
        <h2 className="text-2xl font-bold">Event Management Dashboard</h2>
        <div className="w-full md:w-60">
          {events.length > 0 && (
            <Select value={selectedEvent} onValueChange={setSelectedEvent}>
              <SelectTrigger>
                <SelectValue placeholder="Select an event" />
              </SelectTrigger>
              <SelectContent>
                {events.map((event) => (
                  <SelectItem key={event.id} value={event.id}>
                    {event.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      <Tabs defaultValue="analytics" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="activities">Activities</TabsTrigger>
          <TabsTrigger value="financials">Financials</TabsTrigger>
        </TabsList>

        <TabsContent value="analytics">
          <DashboardAnalytics />
        </TabsContent>

        <TabsContent value="calendar">
          <EventCalendar />
        </TabsContent>

        <TabsContent value="activities">
          {selectedEvent ? (
            <EventActivities eventId={selectedEvent} />
          ) : (
            <Card>
              <CardContent className="py-10 text-center">
                <p className="mb-4 text-gray-500">Select an event to manage activities</p>
                {events.length === 0 && (
                  <Button 
                    onClick={() => navigate("/create")}
                    className="bg-event-purple hover:bg-event-purple/90"
                  >
                    Create Your First Event
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="financials">
          {selectedEvent ? (
            <EventFinancials eventId={selectedEvent} />
          ) : (
            <Card>
              <CardContent className="py-10 text-center">
                <p className="mb-4 text-gray-500">Select an event to manage financials</p>
                {events.length === 0 && (
                  <Button 
                    onClick={() => navigate("/create")}
                    className="bg-event-purple hover:bg-event-purple/90"
                  >
                    Create Your First Event
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Dashboard;
