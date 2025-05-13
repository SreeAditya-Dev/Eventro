import { useParams, Link, useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Calendar, Clock, MapPin, User, Share, Heart, Ticket } from "lucide-react";
import { getEventById } from "@/data/events";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { LocationMap } from "@/components/LocationMap";
import { EventRegistration } from "@/components/EventRegistration";
import { ContactOrganizerModal } from "@/components/ContactOrganizerModal";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

const EventDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<any>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();
      setIsAuthenticated(!!data.session);
      if (data.session) {
        setUserId(data.session.user.id);
        // Check if this event is in the user's favorites
        checkIfFavorite(data.session.user.id, id);
      }
    };

    checkAuth();
    fetchEventDetails();
  }, [id]);

  const fetchEventDetails = async () => {
    try {
      setLoading(true);
      // First try to get from database
      const { data: eventData, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        // If not found in database, fall back to static data
        const staticEvent = getEventById(id || "");
        if (staticEvent) {
          setEvent(staticEvent);
        } else {
          // If still not found, show not found
          setEvent(null);
        }
      } else {
        // Format the event data to match the expected structure
        setEvent({
          ...eventData,
          imageUrl: eventData.image_url,
          endDate: eventData.end_date ? new Date(eventData.end_date) : undefined,
          date: new Date(eventData.date),
          tags: eventData.tags || [],
        });
      }
    } catch (error) {
      console.error("Error fetching event:", error);
    } finally {
      setLoading(false);
    }
  };

  const checkIfFavorite = async (userId: string, eventId: string | undefined) => {
    if (!eventId) return;

    try {
      const { data, error } = await supabase
        .from("user_favorites")
        .select("*")
        .eq("user_id", userId)
        .eq("event_id", eventId);

      if (!error && data && data.length > 0) {
        setIsLiked(true);
      } else {
        setIsLiked(false);
      }
    } catch (error) {
      console.error("Error checking favorite status:", error);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: event.title,
        text: `Check out this event: ${event.title}`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard!");
    }
  };

  const handleLike = async () => {
    if (!isAuthenticated) {
      toast.error("Please log in to save events to favorites");
      navigate("/login");
      return;
    }

    try {
      if (!isLiked) {
        // Add to favorites
        const { error } = await supabase
          .from("user_favorites")
          .insert({
            user_id: userId,
            event_id: id
          });

        if (error) {
          console.error("Error adding favorite:", error);
          throw error;
        }

        setIsLiked(true);
        toast.success("Event added to your favorites!");
      } else {
        // Remove from favorites
        const { data, error } = await supabase
          .from("user_favorites")
          .select("id")
          .eq("user_id", userId)
          .eq("event_id", id);

        if (error) {
          console.error("Error finding favorite:", error);
          throw error;
        }

        if (data && data.length > 0) {
          const favoriteId = data[0].id;

          const { error: deleteError } = await supabase
            .from("user_favorites")
            .delete()
            .eq("id", favoriteId);

          if (deleteError) {
            console.error("Error deleting favorite:", deleteError);
            throw deleteError;
          }

          setIsLiked(false);
          toast.info("Event removed from your favorites");
        }
      }
    } catch (error: any) {
      console.error("Error updating favorites:", error);
      toast.error(error.message || "Failed to update favorites");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        {/* Event Hero Skeleton */}
        <div className="relative bg-event-dark h-72 md:h-96">
          <Skeleton className="w-full h-full" />
          <div className="container px-4 md:px-6 absolute bottom-0 left-0 right-0 pb-8">
            <div className="flex flex-wrap gap-2 mb-4">
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
            <Skeleton className="h-10 w-3/4 mb-2" />
            <Skeleton className="h-6 w-1/2" />
          </div>
        </div>

        <div className="container px-4 md:px-6 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Event Details Skeleton */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
                <Skeleton className="h-8 w-48 mb-4" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4 mb-6" />

                <Skeleton className="h-6 w-40 mb-3" />
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Skeleton className="w-5 h-5 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-5 w-32 mb-1" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4 mt-1" />
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Skeleton className="w-5 h-5 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-5 w-24 mb-1" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Skeleton className="w-5 h-5 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-5 w-28 mb-1" />
                      <Skeleton className="h-4 w-48" />
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <Skeleton className="h-6 w-36 mb-3" />
                  <Skeleton className="h-[200px] w-full rounded-md" />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border p-6">
                <Skeleton className="h-8 w-32 mb-4" />
                <div className="flex items-center gap-4 mb-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div>
                    <Skeleton className="h-5 w-40 mb-1" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                </div>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4 mb-4" />
                <Skeleton className="h-10 w-full rounded-md" />
              </div>
            </div>

            {/* Registration Card Skeleton */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <Skeleton className="h-8 w-24 mb-1" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-9 w-9 rounded-md" />
                    <Skeleton className="h-9 w-9 rounded-md" />
                  </div>
                </div>

                <Separator className="my-4" />

                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Skeleton className="h-4 w-4 rounded-full" />
                    <Skeleton className="h-4 w-32" />
                  </div>

                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-4 rounded-full" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                </div>

                <Skeleton className="h-10 w-full rounded-md mb-3" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="container px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Event not found</h1>
        <p className="mb-8">The event you're looking for doesn't exist or has been removed.</p>
        <Link to="/browse">
          <Button>Browse Events</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Event Hero */}
      <div className="relative bg-event-dark h-72 md:h-96">
        <img
          src={event.imageUrl}
          alt={event.title}
          className="w-full h-full object-cover opacity-70"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent" />

        <div className="container px-4 md:px-6 absolute bottom-0 left-0 right-0 pb-8 text-white">
          <div className="flex flex-wrap gap-2 mb-4">
            <Badge className="bg-event-purple hover:bg-event-purple/90">{event.category}</Badge>
            {event.tags.slice(0, 3).map((tag: string) => (
              <Badge key={tag} variant="outline" className="text-white border-white">
                {tag}
              </Badge>
            ))}
          </div>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-2">{event.title}</h1>
          <p className="text-lg opacity-90">Organized by {event.organizer}</p>
        </div>
      </div>

      <div className="container px-4 md:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Event Details */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
              <h2 className="text-2xl font-bold mb-4">About this event</h2>
              <p className="text-gray-700 whitespace-pre-line mb-6">{event.description}</p>

              <h3 className="text-xl font-semibold mb-3">Event Details</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-event-purple mt-0.5" />
                  <div>
                    <p className="font-medium">Date and Time</p>
                    <p className="text-gray-600">
                      {format(event.date, "EEEE, MMMM d, yyyy")} at {format(event.date, "h:mm a")}
                      {event.endDate && (
                        <>
                          <br />
                          to {format(event.endDate, "EEEE, MMMM d, yyyy")} at {format(event.endDate, "h:mm a")}
                        </>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-event-purple mt-0.5" />
                  <div>
                    <p className="font-medium">Location</p>
                    <p className="text-gray-600">{event.location}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-event-purple mt-0.5" />
                  <div>
                    <p className="font-medium">Attendees</p>
                    <p className="text-gray-600">{event.attendees} people are attending</p>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <h3 className="text-xl font-semibold mb-3">Location Map</h3>
                <LocationMap location={event.location} />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-2xl font-bold mb-4">Organizer</h2>
              <div className="flex items-center gap-4 mb-4">
                <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center">
                  <User className="h-6 w-6 text-gray-500" />
                </div>
                <div>
                  <p className="font-semibold">{event.organizer}</p>
                  <p className="text-sm text-gray-600">Event Organizer</p>
                </div>
              </div>
              <p className="text-gray-700 mb-4">
                Contact the organizer for any questions about this event.
              </p>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  if (!isAuthenticated) {
                    toast.error("Please log in to contact the organizer");
                    navigate("/login");
                    return;
                  }
                  setContactModalOpen(true);
                }}
              >
                Contact Organizer
              </Button>

              {/* Contact Organizer Modal */}
              <ContactOrganizerModal
                isOpen={contactModalOpen}
                onClose={() => setContactModalOpen(false)}
                eventId={id || ""}
                eventTitle={event.title}
                organizerName={event.organizer}
              />
            </div>
          </div>

          {/* Registration Card */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border p-6 sticky top-20">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-2xl mb-1">
                    {event.price === "Free" ? "Free" : event.price}
                  </h3>
                  <p className="text-sm text-gray-600">per ticket</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleShare}
                    className="h-9 w-9"
                  >
                    <Share className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleLike}
                    className={`h-9 w-9 ${isLiked ? 'text-red-500 border-red-500 hover:bg-red-50' : ''}`}
                  >
                    <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
                  </Button>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="h-4 w-4 text-event-purple" />
                  <p className="text-sm">Sales end soon</p>
                </div>

                <div className="flex items-center gap-2">
                  <Ticket className="h-4 w-4 text-event-purple" />
                  <p className="text-sm">{event.attendees} people have registered</p>
                </div>
              </div>

              <EventRegistration
                eventId={event.id}
                eventTitle={event.title}
                eventDate={typeof event.date === 'string' ? event.date : event.date.toISOString()}
                eventLocation={event.location}
                eventOrganizer={event.organizer}
                price={event.price}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventDetail;
