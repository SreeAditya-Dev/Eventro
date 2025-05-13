
import { useState, useEffect } from "react";
import Hero from "@/components/Hero";
import EventCard from "@/components/EventCard";
import Categories from "@/components/Categories";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { getEventsByCategory, getFeaturedEvents, events as staticEvents } from "@/data/events";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import PersonalizedRecommendations from "@/components/PersonalizedRecommendations";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { CalendarIcon, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const Home = () => {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<string[]>([]);

  // Fetch events from database
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);

        // Fetch events from Supabase
        const { data: dbEvents, error } = await supabase
          .from('events')
          .select('*');

        if (error) {
          console.error("Error fetching events:", error);
          // Fall back to static events if database fetch fails
          setEvents(staticEvents.map(event => ({
            ...event,
            imageUrl: event.imageUrl,
            date: new Date(event.date),
            endDate: event.endDate ? new Date(event.endDate) : undefined
          })));
        } else if (dbEvents && dbEvents.length > 0) {
          // Format database events to match the expected structure
          const formattedEvents = dbEvents.map(event => ({
            ...event,
            imageUrl: event.image_url,
            date: new Date(event.date),
            endDate: event.end_date ? new Date(event.end_date) : undefined
          }));
          setEvents(formattedEvents);

          // Extract unique categories
          const uniqueCategories = ["All", ...Array.from(new Set(formattedEvents.map(event => event.category)))];
          setCategories(uniqueCategories);
        } else {
          // If no events in database, use static events
          setEvents(staticEvents.map(event => ({
            ...event,
            imageUrl: event.imageUrl,
            date: new Date(event.date),
            endDate: event.endDate ? new Date(event.endDate) : undefined
          })));
        }
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  // Filter events based on category
  const filteredEvents = events.filter(event =>
    selectedCategory === "All" || event.category === selectedCategory
  );

  // Get featured events
  const featuredEvents = events.filter(event => event.is_featured || event.isFeatured);

  return (
    <div className="flex flex-col min-h-screen">
      <Hero />

      {/* Personalized Recommendations Section */}
      <section className="py-12">
        <div className="container px-4 md:px-6">
          <PersonalizedRecommendations />

          <div className="mt-6 text-center">
            <Link to="/recommendations">
              <Button className="bg-event-purple hover:bg-event-purple/90">
                View All Recommendations
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Events Section */}
      <section className="py-12 bg-gray-50">
        <div className="container px-4 md:px-6">
          <h2 className="text-2xl md:text-3xl font-bold mb-6">Featured Events</h2>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
          ) : featuredEvents.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredEvents.map((event) => (
                <EventCard
                  key={event.id}
                  id={event.id}
                  title={event.title}
                  organizer={event.organizer}
                  date={event.date}
                  location={event.location}
                  imageUrl={event.imageUrl}
                  price={event.price}
                  category={event.category}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">No featured events available at the moment.</p>
            </div>
          )}
          <div className="mt-8 text-center">
            <Link to="/browse">
              <Button variant="outline" className="border-event-purple text-event-purple hover:bg-event-light-purple">
                Explore All Events
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Browse Events by Category */}
      <section className="py-12">
        <div className="container px-4 md:px-6">
          <h2 className="text-2xl md:text-3xl font-bold mb-6">Browse Events</h2>

          <Categories
            onSelectCategory={setSelectedCategory}
            selectedCategory={selectedCategory}
            categories={categories}
          />

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-6">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
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
          ) : filteredEvents.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-6">
                {filteredEvents.slice(0, 8).map((event) => (
                  <EventCard
                    key={event.id}
                    id={event.id}
                    title={event.title}
                    organizer={event.organizer}
                    date={event.date}
                    location={event.location}
                    imageUrl={event.imageUrl}
                    price={event.price}
                    category={event.category}
                  />
                ))}
              </div>

              {filteredEvents.length > 8 && (
                <div className="mt-8 text-center">
                  <Link to="/browse">
                    <Button className="bg-event-purple hover:bg-event-purple/90">
                      View More Events
                    </Button>
                  </Link>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">No events found in this category.</p>
              <Button
                onClick={() => setSelectedCategory("All")}
                className="mt-4"
                variant="outline"
              >
                View All Categories
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Create Your Event Section */}
      <section className="py-12 bg-event-light-purple">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex-1">
              <h2 className="text-2xl md:text-3xl font-bold mb-4">Create Your Own Event</h2>
              <p className="text-gray-700 mb-6">
                Share your passion with others. Whether it's a workshop, concert, or meetup,
                our platform makes it easy to organize and promote your events.
              </p>
              <Link to="/create">
                <Button className="bg-event-purple hover:bg-event-purple/90">Get Started</Button>
              </Link>
            </div>
            <div className="flex-1 max-w-md">
              <img
                src="https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&q=80&w=1000"
                alt="Create event"
                className="w-full h-auto rounded-lg shadow-lg"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
