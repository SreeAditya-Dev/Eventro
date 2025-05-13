
import { useState, useEffect } from "react";
import EventCard from "@/components/EventCard";
import Categories from "@/components/Categories";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter } from "lucide-react";
import { getEventsByCategory, events as staticEvents } from "@/data/events";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const BrowseEvents = () => {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("date");
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
          toast.error("Failed to load events");
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
        toast.error("Something went wrong while loading events");
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  // Filter events based on category and search term
  const filteredEvents = events
    .filter(event => selectedCategory === "All" || event.category === selectedCategory)
    .filter(event =>
      event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.organizer.toLowerCase().includes(searchTerm.toLowerCase())
    );

  // Sort events based on selected sort option
  const sortedEvents = [...filteredEvents].sort((a, b) => {
    if (sortBy === "date") {
      return a.date.getTime() - b.date.getTime();
    } else if (sortBy === "price-low") {
      const aPrice = a.price === "Free" ? 0 : parseInt(a.price.replace(/[^0-9]/g, ''));
      const bPrice = b.price === "Free" ? 0 : parseInt(b.price.replace(/[^0-9]/g, ''));
      return aPrice - bPrice;
    } else if (sortBy === "price-high") {
      const aPrice = a.price === "Free" ? 0 : parseInt(a.price.replace(/[^0-9]/g, ''));
      const bPrice = b.price === "Free" ? 0 : parseInt(b.price.replace(/[^0-9]/g, ''));
      return bPrice - aPrice;
    } else if (sortBy === "popularity") {
      return b.attendees - a.attendees;
    }
    return 0;
  });

  return (
    <div className="container px-4 md:px-6 py-8 mb-8">
      <h1 className="text-3xl font-bold mb-6">Browse Events</h1>

      {/* Search and Filter Bar */}
      <div className="bg-white p-4 rounded-lg shadow-sm border mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-grow relative">
            <Input
              type="text"
              placeholder="Search events by name, location, or organizer"
              className="pr-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="absolute right-3 top-2.5 h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex gap-2">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Date (Soonest)</SelectItem>
                <SelectItem value="price-low">Price (Low to High)</SelectItem>
                <SelectItem value="price-high">Price (High to Low)</SelectItem>
                <SelectItem value="popularity">Popularity</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <span className="hidden md:inline">More Filters</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Categories */}
      <Categories
        onSelectCategory={setSelectedCategory}
        selectedCategory={selectedCategory}
        categories={categories}
      />

      {/* Results Count */}
      <div className="mt-4 mb-6">
        <p className="text-gray-500">
          Showing {sortedEvents.length} {sortedEvents.length === 1 ? 'event' : 'events'}
          {selectedCategory !== "All" && ` in ${selectedCategory}`}
          {searchTerm && ` matching "${searchTerm}"`}
        </p>
      </div>

      {/* Events Grid */}
      {loading ? (
        <div className="text-center py-12">
          <h3 className="text-xl font-medium mb-2">Loading events...</h3>
          <p className="text-gray-500">Please wait while we fetch the latest events</p>
        </div>
      ) : sortedEvents.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {sortedEvents.map((event) => (
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
          <h3 className="text-xl font-medium mb-2">No events found</h3>
          <p className="text-gray-500 mb-6">Try adjusting your search or filters</p>
          <Button
            onClick={() => {
              setSelectedCategory("All");
              setSearchTerm("");
            }}
          >
            Reset filters
          </Button>
        </div>
      )}
    </div>
  );
};

export default BrowseEvents;
