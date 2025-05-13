
import { CalendarIcon, Clock, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter } from "@/components/ui/card";

interface Event {
  id: string;
  title: string;
  organizer: string;
  date: Date;
  location: string;
  imageUrl: string;
  price: string;
  category: string;
}

interface EventCardProps {
  id?: string;
  title?: string;
  organizer?: string;
  date?: Date;
  location?: string;
  imageUrl?: string;
  price?: string;
  category?: string;
  event?: Event;
  onClick?: () => void;
}

const EventCard = ({
  id,
  title,
  organizer,
  date,
  location,
  imageUrl,
  price,
  category,
  event,
  onClick
}: EventCardProps) => {
  // If an event object is provided, use its properties
  const eventId = event?.id || id;
  const eventTitle = event?.title || title;
  const eventOrganizer = event?.organizer || organizer;
  const eventDate = event?.date || date;
  const eventLocation = event?.location || location;
  const eventImageUrl = event?.imageUrl || imageUrl;
  const eventPrice = event?.price || price;
  const eventCategory = event?.category || category;
  const formattedDate = eventDate ? formatDistanceToNow(new Date(eventDate), { addSuffix: true }) : '';

  // If any required props are missing, return null
  if (!eventId || !eventTitle || !eventDate || !eventLocation || !eventImageUrl || !eventPrice || !eventCategory) {
    return null;
  }

  const cardContent = (
    <Card className="overflow-hidden event-card h-full flex flex-col">
      <div className="relative h-48">
        <img
          src={eventImageUrl}
          alt={eventTitle}
          className="w-full h-full object-cover"
        />
        {eventPrice === "Free" ? (
          <Badge className="absolute top-3 right-3 bg-green-500 hover:bg-green-600">Free</Badge>
        ) : (
          <Badge className="absolute top-3 right-3 bg-event-blue hover:bg-event-blue/90">
            {eventPrice}
          </Badge>
        )}
      </div>
      <CardContent className="pt-4 flex-grow">
        <div className="flex items-center text-sm text-muted-foreground mb-2">
          <CalendarIcon className="w-4 h-4 mr-1" />
          <span>{formattedDate}</span>
        </div>
        <h3 className="text-lg font-semibold line-clamp-2 mb-1">{eventTitle}</h3>
        <p className="text-sm text-muted-foreground mb-2">by {eventOrganizer}</p>
        <div className="flex items-center text-sm text-muted-foreground">
          <MapPin className="w-4 h-4 mr-1" />
          <span className="line-clamp-1">{eventLocation}</span>
        </div>
      </CardContent>
      <CardFooter className="pt-0 pb-4">
        <Badge variant="outline" className="bg-event-light-purple text-event-purple hover:bg-event-light-purple">
          {eventCategory}
        </Badge>
      </CardFooter>
    </Card>
  );

  // Create a wrapper that handles both onClick and navigation
  const handleCardClick = () => {
    if (onClick) {
      onClick();
    }
  };

  // Always wrap in a Link for navigation, but also handle onClick if provided
  return (
    <Link to={`/event/${eventId}`}>
      <div onClick={handleCardClick} className="cursor-pointer">
        {cardContent}
      </div>
    </Link>
  );
};

export default EventCard;
