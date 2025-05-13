
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Users, Ticket, UserCheck, CalendarIcon, ChevronUp, ChevronDown
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

interface Event {
  id: string;
  title: string;
  date: string;
  attendees: number;
  location: string;
}

interface EventCheckIn {
  id: string;
  event_id: string;
  checked_in_at: string;
}

interface EventTicket {
  id: string;
  event_id: string;
  purchase_date: string;
}

interface Distribution {
  id: string;
  event_id: string;
  item_type: string;
}

interface AttendeeData {
  company: string;
  position: string;
}

interface ChartData {
  name: string;
  value: number;
}

const DashboardAnalytics = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [checkIns, setCheckIns] = useState<EventCheckIn[]>([]);
  const [ticketRegistrations, setTicketRegistrations] = useState<EventTicket[]>([]);
  const [distributions, setDistributions] = useState<Distribution[]>([]);
  const [attendees, setAttendees] = useState<AttendeeData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error("You must be logged in to view dashboard data");
        return;
      }
      
      // Get user's profile to match with organizer field
      const { data: profileData } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', session.user.id)
        .single();
      
      if (!profileData) return;
      
      const fullName = `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim();
      
      // Fetch user's events
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('id, title, date, attendees, location')
        .eq('organizer', fullName);
      
      if (eventsError) throw eventsError;
      const userEvents = eventsData || [];
      setEvents(userEvents);
      
      if (userEvents.length === 0) {
        setLoading(false);
        return;
      }
      
      // Get event IDs for user's events
      const eventIds = userEvents.map(event => event.id);
      
      // Fetch check-ins data
      const { data: checkInsData } = await supabase
        .from('event_check_ins')
        .select('id, event_id, checked_in_at')
        .in('event_id', eventIds);
      
      setCheckIns(checkInsData || []);
      
      // Fetch ticket registrations
      const { data: ticketsData } = await supabase
        .from('event_tickets')
        .select('id, event_id, purchase_date')
        .in('event_id', eventIds);
      
      setTicketRegistrations(ticketsData || []);
      
      // Fetch distributions
      const { data: distributionsData } = await supabase
        .from('distributions')
        .select('id, event_id, item_type')
        .in('event_id', eventIds);
      
      setDistributions(distributionsData || []);
      
      // Fetch attendee data for demographics
      const { data: attendeesData } = await supabase
        .from('attendees')
        .select('company, position');
      
      setAttendees(attendeesData || []);
    } catch (error: any) {
      console.error("Error fetching dashboard data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  // Calculate event attendance percentage
  const calculateAttendanceRate = () => {
    if (!events.length) return 0;
    
    const totalAttendees = events.reduce((sum, event) => sum + (event.attendees || 0), 0);
    const totalCheckins = checkIns.length;
    
    return totalAttendees > 0 ? Math.round((totalCheckins / totalAttendees) * 100) : 0;
  };

  // Prepare data for charts
  
  // Event comparison data
  const eventComparisonData = events.map(event => ({
    name: event.title.length > 15 ? event.title.substring(0, 15) + '...' : event.title,
    registrations: event.attendees || 0,
    checkins: checkIns.filter(ci => ci.event_id === event.id).length,
  })).slice(0, 5); // Limit to top 5 events
  
  // Registration trends data - group by date
  const prepareRegistrationTrends = () => {
    if (!ticketRegistrations.length) return [];
    
    const registrationsByDate = ticketRegistrations.reduce((acc: Record<string, number>, ticket) => {
      const date = new Date(ticket.purchase_date).toISOString().split('T')[0];
      
      if (!acc[date]) {
        acc[date] = 0;
      }
      acc[date]++;
      
      return acc;
    }, {});
    
    return Object.entries(registrationsByDate)
      .map(([date, count]) => ({ date, value: count }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-10); // Get the last 10 days with data
  };
  
  // Company distribution data
  const prepareCompanyDistribution = () => {
    if (!attendees.length) return [];
    
    const companyCounts: Record<string, number> = {};
    
    attendees.forEach(attendee => {
      const company = attendee.company || 'Unknown';
      
      if (!companyCounts[company]) {
        companyCounts[company] = 0;
      }
      companyCounts[company]++;
    });
    
    // Sort by count and take top 5, consolidate others
    const sortedCompanies = Object.entries(companyCounts)
      .sort((a, b) => b[1] - a[1]);
    
    let result: ChartData[] = [];
    
    if (sortedCompanies.length > 5) {
      const top5 = sortedCompanies.slice(0, 5);
      const others = sortedCompanies.slice(5).reduce((sum, [_, count]) => sum + count, 0);
      
      result = [
        ...top5.map(([name, value]) => ({ name, value })),
        { name: 'Others', value: others }
      ];
    } else {
      result = sortedCompanies.map(([name, value]) => ({ name, value }));
    }
    
    return result;
  };
  
  // Job roles distribution data
  const prepareRoleDistribution = () => {
    if (!attendees.length) return [];
    
    const roleCounts: Record<string, number> = {};
    
    attendees.forEach(attendee => {
      const position = attendee.position || 'Unknown';
      
      if (!roleCounts[position]) {
        roleCounts[position] = 0;
      }
      roleCounts[position]++;
    });
    
    // Sort by count and take top 5, consolidate others
    const sortedRoles = Object.entries(roleCounts)
      .sort((a, b) => b[1] - a[1]);
    
    let result: ChartData[] = [];
    
    if (sortedRoles.length > 5) {
      const top5 = sortedRoles.slice(0, 5);
      const others = sortedRoles.slice(5).reduce((sum, [_, count]) => sum + count, 0);
      
      result = [
        ...top5.map(([name, value]) => ({ name, value })),
        { name: 'Others', value: others }
      ];
    } else {
      result = sortedRoles.map(([name, value]) => ({ name, value }));
    }
    
    return result;
  };
  
  // Distribution items data
  const prepareDistributionItems = () => {
    if (!distributions.length) return [];
    
    const itemCounts: Record<string, number> = {};
    
    distributions.forEach(dist => {
      const itemType = dist.item_type || 'Unknown';
      
      if (!itemCounts[itemType]) {
        itemCounts[itemType] = 0;
      }
      itemCounts[itemType]++;
    });
    
    return Object.entries(itemCounts).map(([name, value]) => ({ name, value }));
  };

  // Calculate distribution efficiency
  const calculateDistributionEfficiency = () => {
    const totalCheckins = checkIns.length;
    const totalDistributions = distributions.length;
    
    return totalCheckins > 0 ? Math.round((totalDistributions / totalCheckins) * 100) : 0;
  };

  // Chart color palettes
  const COLORS = ['#8884d8', '#83a6ed', '#8dd1e1', '#82ca9d', '#a4de6c', '#d0ed57'];
  const PIE_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#AFB2F9'];

  const registrationTrendsData = prepareRegistrationTrends();
  const companyDistributionData = prepareCompanyDistribution();
  const roleDistributionData = prepareRoleDistribution();
  const distributionItemsData = prepareDistributionItems();

  return (
    <>
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-event-purple border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
          <p className="mt-4 text-gray-500">Loading dashboard data...</p>
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-12">
          <CalendarIcon className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-4 text-lg text-gray-500">No events found</p>
          <p className="mt-2 text-sm text-gray-400">
            Create your first event to see analytics data
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4 flex items-center">
              <div className="rounded-full bg-blue-100 p-3 mr-4">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Total Attendees</p>
                <p className="text-2xl font-bold">
                  {events.reduce((sum, event) => sum + (event.attendees || 0), 0)}
                </p>
              </div>
            </Card>
            
            <Card className="p-4 flex items-center">
              <div className="rounded-full bg-green-100 p-3 mr-4">
                <Ticket className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Registrations</p>
                <p className="text-2xl font-bold">{ticketRegistrations.length}</p>
              </div>
            </Card>
            
            <Card className="p-4 flex items-center">
              <div className="rounded-full bg-amber-100 p-3 mr-4">
                <UserCheck className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Check-ins</p>
                <p className="text-2xl font-bold">{checkIns.length}</p>
              </div>
            </Card>
            
            <Card className="p-4 flex items-center">
              <div className="rounded-full bg-purple-100 p-3 mr-4">
                <div className="flex items-center justify-center h-6 w-6 text-purple-600">
                  <span className="text-lg font-bold">%</span>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Attendance Rate</p>
                <div className="flex items-center">
                  <p className="text-2xl font-bold">{calculateAttendanceRate()}%</p>
                  {calculateAttendanceRate() >= 70 ? (
                    <ChevronUp className="h-4 w-4 ml-1 text-green-500" />
                  ) : (
                    <ChevronDown className="h-4 w-4 ml-1 text-red-500" />
                  )}
                </div>
              </div>
            </Card>
          </div>
          
          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Event Performance Comparison</CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                {eventComparisonData.length > 0 ? (
                  <ChartContainer config={{}} className="aspect-video h-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={eventComparisonData}
                        margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="name" 
                          angle={-45}
                          textAnchor="end"
                          height={60}
                        />
                        <YAxis />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="registrations" name="Registrations" fill="#8884d8" />
                        <Bar dataKey="checkins" name="Check-ins" fill="#82ca9d" />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <p className="text-gray-400">No data available</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Registration Trends</CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                {registrationTrendsData.length > 0 ? (
                  <ChartContainer config={{}} className="aspect-video h-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={registrationTrendsData}
                        margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="date" 
                          angle={-45}
                          textAnchor="end"
                          height={60}
                        />
                        <YAxis />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="value" name="Registrations" fill="#0088FE" />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <p className="text-gray-400">No registration data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          {/* Charts Row 2 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Attendee Companies</CardTitle>
              </CardHeader>
              <CardContent className="h-60">
                {companyDistributionData.length > 0 ? (
                  <ChartContainer config={{}} className="aspect-square h-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={companyDistributionData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          nameKey="name"
                          label={(entry) => entry.name}
                        >
                          {companyDistributionData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <ChartTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <p className="text-gray-400">No company data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Attendee Job Roles</CardTitle>
              </CardHeader>
              <CardContent className="h-60">
                {roleDistributionData.length > 0 ? (
                  <ChartContainer config={{}} className="aspect-square h-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={roleDistributionData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          nameKey="name"
                          label={(entry) => entry.name}
                        >
                          {roleDistributionData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <ChartTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <p className="text-gray-400">No job role data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Resource Distribution</CardTitle>
              </CardHeader>
              <CardContent className="h-60">
                {distributionItemsData.length > 0 ? (
                  <ChartContainer config={{}} className="aspect-square h-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={distributionItemsData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          nameKey="name"
                          label={(entry) => entry.name}
                        >
                          {distributionItemsData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <ChartTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <p className="text-gray-400">No distribution data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          {/* Distribution Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Distribution Efficiency</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-2">Overall Efficiency</p>
                  <div className="relative pt-1">
                    <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200">
                      <div
                        className={cn(
                          "shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center",
                          calculateDistributionEfficiency() >= 90 
                            ? "bg-green-500" 
                            : calculateDistributionEfficiency() >= 70 
                              ? "bg-yellow-500" 
                              : "bg-red-500"
                        )}
                        style={{ width: `${calculateDistributionEfficiency()}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-xs font-semibold inline-block text-gray-600">
                        {calculateDistributionEfficiency()}%
                      </span>
                      <span className="text-xs font-semibold inline-block text-gray-600">
                        Target: 95%
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Percentage of checked-in attendees who received items
                  </p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-2">Distributed Items</p>
                  <p className="text-3xl font-bold">{distributions.length}</p>
                  <div className="flex items-center mt-2">
                    <span className="text-sm text-gray-500 mr-2">Items per Person:</span>
                    <span className="font-medium">{checkIns.length > 0 ? (distributions.length / checkIns.length).toFixed(1) : '0'}</span>
                  </div>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-2">Resource Utilization</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {distributionItemsData.slice(0, 4).map((item, index) => (
                      <div key={index} className="flex justify-between">
                        <span>{item.name}:</span>
                        <span className="font-medium">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
};

export default DashboardAnalytics;
