import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Star, MessageSquare, User, Calendar } from "lucide-react";

interface Feedback {
  id: string;
  event_id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
  user: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  };
}

interface Event {
  id: string;
  title: string;
  date: string;
  organizer: string;
}

export const FeedbackManagement = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedFeedback, setExpandedFeedback] = useState<string | null>(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      fetchFeedback(selectedEventId);
    } else {
      setFeedback([]);
    }
  }, [selectedEventId]);

  const fetchEvents = async () => {
    try {
      setLoading(true);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user profile to get name
      const { data: profileData } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', user.id)
        .single();

      if (!profileData) return;

      const fullName = `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim();

      // Fetch events where the user is the organizer
      const { data, error } = await supabase
        .from('events')
        .select('id, title, date, organizer')
        .eq('organizer', fullName)
        .order('date', { ascending: false });

      if (error) throw error;

      setEvents(data || []);

      // If there are events, select the first one by default
      if (data && data.length > 0) {
        setSelectedEventId(data[0].id);
      }
    } catch (error) {
      console.error("Error fetching events:", error);
      toast.error("Failed to load events");
    } finally {
      setLoading(false);
    }
  };

  const fetchFeedback = async (eventId: string) => {
    try {
      setLoading(true);

      // Fetch feedback for the selected event without the join
      const { data: feedbackData, error: feedbackError } = await supabase
        .from('feedback')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (feedbackError) throw feedbackError;

      if (feedbackData && feedbackData.length > 0) {
        // Get all user IDs from the feedback
        const userIds = feedbackData.map(item => item.user_id);

        // Fetch user profiles separately
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email')
          .in('id', userIds);

        if (profilesError) throw profilesError;

        // Combine the feedback with user profiles
        const enrichedFeedback = feedbackData.map(feedback => {
          const userProfile = profilesData?.find(profile => profile.id === feedback.user_id);

          return {
            ...feedback,
            user: {
              first_name: userProfile?.first_name || 'Unknown',
              last_name: userProfile?.last_name || 'User',
              email: userProfile?.email || 'No email'
            }
          };
        });

        setFeedback(enrichedFeedback);
      } else {
        setFeedback([]);
      }
    } catch (error) {
      console.error("Error fetching feedback:", error);
      toast.error("Failed to load feedback");
    } finally {
      setLoading(false);
    }
  };

  const toggleExpandFeedback = (id: string) => {
    if (expandedFeedback === id) {
      setExpandedFeedback(null);
    } else {
      setExpandedFeedback(id);
    }
  };

  const getAverageRating = () => {
    if (feedback.length === 0) return 0;
    const sum = feedback.reduce((acc, item) => acc + item.rating, 0);
    return (sum / feedback.length).toFixed(1);
  };

  const getRatingDistribution = () => {
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    feedback.forEach(item => {
      distribution[item.rating as keyof typeof distribution]++;
    });

    return distribution;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Feedback Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Select Event</label>
              <Select
                value={selectedEventId}
                onValueChange={setSelectedEventId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select an event" />
                </SelectTrigger>
                <SelectContent>
                  {events.map(event => (
                    <SelectItem key={event.id} value={event.id}>
                      {event.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedEventId && (
              <div className="space-y-6">
                {feedback.length > 0 ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card className="p-4 flex flex-col items-center justify-center">
                        <div className="text-3xl font-bold text-yellow-500 flex items-center">
                          {getAverageRating()}
                          <Star className="h-6 w-6 ml-1 fill-yellow-500" />
                        </div>
                        <p className="text-sm text-gray-500">Average Rating</p>
                      </Card>

                      <Card className="p-4 flex flex-col items-center justify-center">
                        <div className="text-3xl font-bold text-blue-500">
                          {feedback.length}
                        </div>
                        <p className="text-sm text-gray-500">Total Feedback</p>
                      </Card>

                      <Card className="p-4 flex flex-col items-center justify-center">
                        <div className="text-3xl font-bold text-green-500">
                          {feedback.filter(f => f.rating >= 4).length}
                        </div>
                        <p className="text-sm text-gray-500">Positive Feedback</p>
                      </Card>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Feedback List</h3>

                      {feedback.map(item => (
                        <Card
                          key={item.id}
                          className={`p-4 cursor-pointer transition-all ${
                            expandedFeedback === item.id ? 'ring-2 ring-primary' : ''
                          }`}
                          onClick={() => toggleExpandFeedback(item.id)}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex items-start space-x-2">
                              <div className="bg-gray-100 p-2 rounded-full">
                                <User className="h-5 w-5 text-gray-600" />
                              </div>
                              <div>
                                <h4 className="font-medium">
                                  {item.user.first_name} {item.user.last_name}
                                </h4>
                                <div className="flex items-center mt-1">
                                  {Array.from({ length: 5 }).map((_, i) => (
                                    <Star
                                      key={i}
                                      className={`h-4 w-4 ${
                                        i < item.rating
                                          ? "text-yellow-400 fill-yellow-400"
                                          : "text-gray-300"
                                      }`}
                                    />
                                  ))}
                                </div>
                              </div>
                            </div>
                            <div className="text-sm text-gray-500 flex items-center">
                              <Calendar className="h-3 w-3 mr-1" />
                              {format(new Date(item.created_at), "MMM d, yyyy")}
                            </div>
                          </div>

                          {(item.comment || expandedFeedback === item.id) && (
                            <div className={`mt-3 ${expandedFeedback === item.id ? 'block' : 'line-clamp-2'}`}>
                              <div className="flex items-start space-x-2">
                                <MessageSquare className="h-4 w-4 text-gray-500 mt-1" />
                                <p className="text-gray-700">
                                  {item.comment || "No comment provided."}
                                </p>
                              </div>

                              {expandedFeedback === item.id && (
                                <div className="mt-3 text-sm text-gray-500">
                                  <p>Email: {item.user.email}</p>
                                  <p>Submitted: {format(new Date(item.created_at), "MMMM d, yyyy 'at' h:mm a")}</p>
                                  {item.updated_at !== item.created_at && (
                                    <p>Updated: {format(new Date(item.updated_at), "MMMM d, yyyy 'at' h:mm a")}</p>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </Card>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <h3 className="text-lg font-medium">No Feedback Yet</h3>
                    <p className="text-gray-500 mt-1">
                      There is no feedback for this event yet.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
