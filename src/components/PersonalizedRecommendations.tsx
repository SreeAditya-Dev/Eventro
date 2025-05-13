import { useState, useEffect } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, CalendarIcon, MapPin } from "lucide-react";
import EventCard from "@/components/EventCard";
import { getRecommendedEvents, trackUserInteraction } from "@/services/recommendationService";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

interface PersonalizedRecommendationsProps {
  userId?: string;
}

const PersonalizedRecommendations = ({ userId }: PersonalizedRecommendationsProps) => {
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(userId);

  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();
      const isAuth = !!data.session;
      setIsAuthenticated(isAuth);

      if (isAuth && !currentUserId) {
        setCurrentUserId(data.session?.user.id);
      }
    };

    checkAuth();
  }, [userId, currentUserId]);

  useEffect(() => {
    if (isAuthenticated && currentUserId) {
      loadRecommendations();
    }
  }, [isAuthenticated, currentUserId]);

  const loadRecommendations = async () => {
    if (!currentUserId) return;

    setLoading(true);
    try {
      const recommendedEvents = await getRecommendedEvents(currentUserId);
      setRecommendations(recommendedEvents.slice(0, 3)); // Show top 3
    } catch (error) {
      console.error("Error loading recommendations:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEventClick = async (eventId: string) => {
    if (currentUserId) {
      // Track the interaction but don't prevent navigation
      trackUserInteraction(currentUserId, eventId, 'click').catch(error => {
        console.error("Error tracking interaction:", error);
      });
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div id="personalized-recommendations" className="mt-8">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-5 w-5 text-primary" />
        <h2 className="text-2xl font-bold">Recommended for You</h2>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="overflow-hidden event-card h-full flex flex-col">
              <div className="relative h-48">
                <Skeleton className="w-full h-full" />
                <div className="absolute top-3 right-3">
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
              </div>
              <CardContent className="pt-4 flex-grow">
                <div className="flex items-center mb-2">
                  <Skeleton className="w-4 h-4 mr-1 rounded-full" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-6 w-full mb-2" />
                <Skeleton className="h-4 w-3/4 mb-2" />
                <div className="flex items-center">
                  <Skeleton className="w-4 h-4 mr-1 rounded-full" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </CardContent>
              <CardFooter className="pt-0 pb-4">
                <Skeleton className="h-6 w-24 rounded-full" />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : recommendations.length === 0 ? (
        <div className="text-center py-8">
          <div className="mb-4 text-gray-500">
            <Sparkles className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-lg font-medium">No recommendations available yet</p>
          </div>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            We're still learning about your preferences. Try updating your interests or exploring more events to get personalized recommendations.
          </p>
          <Button
            variant="outline"
            onClick={loadRecommendations}
            className="mx-auto"
          >
            Refresh Recommendations
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {recommendations.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              onClick={() => handleEventClick(event.id)}
            />
          ))}
        </div>
      )}

      <div className="mt-4 flex justify-center">
        {loading ? (
          <Skeleton className="h-10 w-48 rounded-md" />
        ) : (
          <Button
            variant="outline"
            onClick={loadRecommendations}
            disabled={loading}
            data-refresh="true"
          >
            Refresh Recommendations
          </Button>
        )}
      </div>
    </div>
  );
};

export default PersonalizedRecommendations;
