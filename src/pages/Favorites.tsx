
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Trash } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

interface FavoriteEvent {
  id: string;
  event_id: string;
  user_id: string;
  created_at: string;
  event: {
    id: string;
    title: string;
    date: string;
    location: string;
    price: string;
    category: string;
    image_url: string;
  };
}

const Favorites = () => {
  const [favorites, setFavorites] = useState<FavoriteEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data } = await supabase.auth.getSession();

    if (!data.session) {
      toast.error("Please sign in to view your favorites");
      navigate("/login");
      return;
    }

    fetchFavorites(data.session.user.id);
  };

  const fetchFavorites = async (userId: string) => {
    try {
      setLoading(true);

      // Get user's favorite events with join
      const { data: favoritesData, error } = await supabase
        .from("user_favorites")
        .select("*")
        .eq("user_id", userId);

      if (error) {
        console.error("Error fetching favorites:", error);
        throw error;
      }

      // If no favorites, return early
      if (!favoritesData?.length) {
        setFavorites([]);
        setLoading(false);
        return;
      }

      // Create an array to store favorites with event data
      const favoriteEvents: FavoriteEvent[] = [];

      // For each favorite, fetch the associated event
      for (const fav of favoritesData) {
        const { data: eventData, error: eventError } = await supabase
          .from("events")
          .select("*")
          .eq("id", fav.event_id)
          .single();

        if (eventData && !eventError) {
          favoriteEvents.push({
            ...fav,
            event: {
              id: eventData.id,
              title: eventData.title,
              date: eventData.date,
              location: eventData.location,
              price: eventData.price,
              category: eventData.category,
              image_url: eventData.image_url
            }
          });
        }
      }

      setFavorites(favoriteEvents);

    } catch (error: any) {
      console.error("Error fetching favorites:", error);
      toast.error(error.message || "Failed to load favorites");
    } finally {
      setLoading(false);
    }
  };

  const removeFavorite = async (favoriteId: string) => {
    try {
      const { error } = await supabase
        .from("user_favorites")
        .delete()
        .eq("id", favoriteId);

      if (error) throw error;

      // Remove the favorite from state
      setFavorites(favorites.filter(fav => fav.id !== favoriteId));

      toast.success("Event removed from favorites");

    } catch (error: any) {
      console.error("Error removing favorite:", error);
      toast.error(error.message || "Failed to remove from favorites");
    }
  };

  if (loading) {
    return (
      <div className="container py-8">
        <Skeleton className="h-8 w-48 mb-6" />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="overflow-hidden flex flex-col">
              <div className="relative h-40">
                <Skeleton className="w-full h-full" />
                <div className="absolute top-2 right-2">
                  <Skeleton className="h-8 w-8 rounded-full" />
                </div>
              </div>

              <CardContent className="pt-4 flex-grow">
                <div className="flex items-center gap-2 mb-2">
                  <Skeleton className="h-5 w-20 rounded-full" />
                  <Skeleton className="h-5 w-12" />
                </div>

                <Skeleton className="h-6 w-full mb-2" />

                <div className="space-y-1">
                  <div className="flex items-center gap-1">
                    <Skeleton className="h-3.5 w-3.5 rounded-full" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <div className="flex items-center gap-1">
                    <Skeleton className="h-3.5 w-3.5 rounded-full" />
                    <Skeleton className="h-4 w-40" />
                  </div>
                </div>
              </CardContent>

              <CardFooter className="pt-0 pb-4">
                <Skeleton className="h-10 w-full rounded-md" />
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (favorites.length === 0) {
    return (
      <div className="container py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">Your Favorites</h1>
        <p className="mb-6 text-gray-600">You haven't added any events to your favorites yet.</p>
        <Button
          className="bg-event-purple hover:bg-event-purple/90"
          onClick={() => navigate("/browse")}
        >
          Browse Events
        </Button>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-6">Your Favorite Events</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {favorites.map(favorite => (
          <Card key={favorite.id} className="overflow-hidden flex flex-col">
            <div className="relative h-40">
              <img
                src={favorite.event.image_url}
                alt={favorite.event.title}
                className="object-cover w-full h-full"
              />
              <div className="absolute top-2 right-2">
                <Button
                  variant="destructive"
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  onClick={() => removeFavorite(favorite.id)}
                >
                  <Trash className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <CardContent className="pt-4 flex-grow">
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-event-purple/10 text-event-purple text-xs font-medium px-2.5 py-0.5 rounded">
                  {favorite.event.category}
                </span>
                <span className="text-sm font-semibold">{favorite.event.price}</span>
              </div>

              <h3 className="font-semibold text-lg mb-2 line-clamp-1">
                {favorite.event.title}
              </h3>

              <div className="text-sm text-gray-500 space-y-1">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{format(new Date(favorite.event.date), "MMM d, yyyy • h:mm a")}</span>
                </div>
                <div className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  <span className="line-clamp-1">{favorite.event.location}</span>
                </div>
              </div>
            </CardContent>

            <CardFooter className="pt-0 pb-4">
              <Button
                asChild
                className="w-full bg-event-purple hover:bg-event-purple/90"
              >
                <Link to={`/event/${favorite.event.id}`}>
                  View Event
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Favorites;
