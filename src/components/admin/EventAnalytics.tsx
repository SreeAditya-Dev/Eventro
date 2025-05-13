
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Users, UserCheck, Calendar, Clock } from "lucide-react";
import { format, isAfter, isBefore, isToday } from "date-fns";
import {
  ChartContainer,
  ChartLegend,
  ChartTooltip,
  ChartTooltipContent
} from "@/components/ui/chart";
import { BarChart, LineChart, PieChart, Pie, Bar, Line, Cell, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";

interface Event {
  id: string;
  title: string;
  date: string;
  end_date: string | null;
  location: string;
  organizer: string;
  attendees: number;
  category: string;
  created_at: string;
}

interface Ticket {
  id: string;
  event_id: string;
  user_id: string;
  purchase_date: string;
  ticket_code: string;
  quantity: number;
}

interface CheckIn {
  id: string;
  ticket_id: string;
  event_id: string;
  checked_in_at: string;
}

interface RegistrationData {
  date: string;
  count: number;
}

const EventAnalytics = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [registrationData, setRegistrationData] = useState<RegistrationData[]>([]);
  const [eventStatus, setEventStatus] = useState<'upcoming' | 'ongoing' | 'past'>('upcoming');

  useEffect(() => {
    if (eventId) {
      fetchEventData();
    }
  }, [eventId]);

  const fetchEventData = async () => {
    try {
      setLoading(true);
      
      // Fetch event details
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();
      
      if (eventError) {
        toast.error("Event not found");
        navigate("/admin");
        return;
      }
      
      setEvent(eventData);
      
      // Determine event status
      const eventDate = new Date(eventData.date);
      const eventEndDate = eventData.end_date ? new Date(eventData.end_date) : new Date(eventDate);
      eventEndDate.setHours(eventEndDate.getHours() + 2); // Default to 2 hours if no end date
      
      const now = new Date();
      
      if (isBefore(now, eventDate)) {
        setEventStatus('upcoming');
      } else if (isAfter(now, eventEndDate)) {
        setEventStatus('past');
      } else {
        setEventStatus('ongoing');
      }
      
      // Fetch tickets for this event
      const { data: ticketsData, error: ticketsError } = await supabase
        .from('event_tickets')
        .select('*')
        .eq('event_id', eventId);
      
      if (ticketsError) {
        console.error("Error fetching tickets:", ticketsError);
        toast.error("Failed to load ticket data");
        return;
      }
      
      setTickets(ticketsData || []);
      
      // Fetch check-ins for this event
      const { data: checkInsData, error: checkInsError } = await supabase
        .from('event_check_ins')
        .select('*')
        .eq('event_id', eventId);
      
      if (checkInsError) {
        console.error("Error fetching check-ins:", checkInsError);
        toast.error("Failed to load check-in data");
        return;
      }
      
      setCheckIns(checkInsData || []);
      
      // Process registration data for chart
      if (ticketsData) {
        const registrationsByDate: Record<string, number> = {};
        
        ticketsData.forEach(ticket => {
          const date = format(new Date(ticket.purchase_date), 'yyyy-MM-dd');
          registrationsByDate[date] = (registrationsByDate[date] || 0) + ticket.quantity;
        });
        
        const chartData = Object.entries(registrationsByDate)
          .map(([date, count]) => ({ date, count }))
          .sort((a, b) => a.date.localeCompare(b.date));
        
        setRegistrationData(chartData);
      }
      
    } catch (error) {
      console.error("Error:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const getAttendeePercentage = () => {
    if (!event || !checkIns.length) return 0;
    return Math.round((checkIns.length / event.attendees) * 100);
  };

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042'];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => navigate("/admin")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Events
        </Button>
        <h2 className="text-2xl font-bold">{event?.title || 'Event Analytics'}</h2>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <p className="text-gray-500">Loading event data...</p>
        </div>
      ) : event ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Total Registrations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <Users className="h-5 w-5 text-event-purple mr-2" />
                  <span className="text-2xl font-bold">{event.attendees || 0}</span>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Check-ins</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <UserCheck className="h-5 w-5 text-green-600 mr-2" />
                  <span className="text-2xl font-bold">{checkIns.length}</span>
                  <span className="text-sm text-gray-500 ml-2">
                    ({getAttendeePercentage()}% of registrations)
                  </span>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Event Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <Calendar className="h-5 w-5 text-blue-600 mr-2" />
                  <span className="text-lg font-medium capitalize">{eventStatus}</span>
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  {format(new Date(event.date), "MMMM d, yyyy 'at' h:mm a")}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Registration Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={registrationData}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="count" 
                        name="Registrations" 
                        stroke="#8884d8" 
                        activeDot={{ r: 8 }} 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Attendance Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Checked In', value: checkIns.length },
                          { name: 'Not Checked In', value: event.attendees - checkIns.length }
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {[
                          { name: 'Checked In', value: checkIns.length },
                          { name: 'Not Checked In', value: event.attendees - checkIns.length }
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-500">Event not found</p>
        </div>
      )}
    </div>
  );
};

export default EventAnalytics;
