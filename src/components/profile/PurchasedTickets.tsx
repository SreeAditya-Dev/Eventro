
import { useState, useEffect } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Ticket, Download, Mail, Calendar, MapPin, MessageSquare, Star } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { generateTicketPDF } from "@/utils/ticketGenerator";
import { sendTicketByEmail } from "@/utils/emailService";
import { FeedbackForm } from "./FeedbackForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface Event {
  id: string;
  title: string;
  date: string;
  location: string;
  imageUrl: string;
  organizer: string;
}

interface Feedback {
  id: string;
  rating: number;
  comment: string | null;
}

interface EventTicket {
  id: string;
  event_id: string;
  user_id: string;
  purchase_date: string;
  ticket_code: string;
  quantity: number;
  event: Event;
  feedback?: Feedback;
}

interface PurchasedTicketsProps {
  userId: string;
}

export const PurchasedTickets = ({ userId }: PurchasedTicketsProps) => {
  const [tickets, setTickets] = useState<EventTicket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTickets();
  }, [userId]);

  const fetchTickets = async () => {
    try {
      setLoading(true);

      // Fetch tickets for the user from the event_tickets table
      const { data: ticketsData, error: ticketsError } = await supabase
        .from('event_tickets')
        .select('*')
        .eq('user_id', userId);

      if (ticketsError) throw ticketsError;

      // Create an array to store the tickets with event data
      const enrichedTickets = [];

      // For each ticket, fetch the corresponding event data
      for (const ticket of ticketsData || []) {
        // Get event details from the events table
        const { data: eventData, error: eventError } = await supabase
          .from('events')
          .select('*')
          .eq('id', ticket.event_id)
          .single();

        // Get feedback for this event from the user
        const { data: feedbackData } = await supabase
          .from('feedback')
          .select('id, rating, comment')
          .eq('event_id', ticket.event_id)
          .eq('user_id', userId)
          .single();

        // If we found the event, add it to our enriched tickets
        if (eventData && !eventError) {
          enrichedTickets.push({
            ...ticket,
            event: {
              id: eventData.id,
              title: eventData.title,
              date: eventData.date,
              location: eventData.location,
              imageUrl: eventData.image_url,
              organizer: eventData.organizer
            },
            feedback: feedbackData || undefined
          });
        } else {
          // If we couldn't find the event in the database, use a placeholder
          enrichedTickets.push({
            ...ticket,
            event: {
              id: ticket.event_id,
              title: "Event",
              date: new Date().toISOString(),
              location: "Location",
              imageUrl: "/placeholder.svg",
              organizer: "Organizer"
            },
            feedback: feedbackData || undefined
          });
        }
      }

      setTickets(enrichedTickets as EventTicket[]);
    } catch (error) {
      console.error("Error fetching tickets:", error);
      toast.error("Failed to load your tickets");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTicket = async (ticket: EventTicket) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', userId)
        .single();

      if (error || !data) {
        toast.error("Could not find your profile information");
        return;
      }

      const fullName = `${data.first_name || ''} ${data.last_name || ''}`.trim() || 'Attendee';

      const ticketData = {
        id: ticket.id,
        ticket_code: ticket.ticket_code,
        event: {
          title: ticket.event.title,
          date: ticket.event.date,
          location: ticket.event.location,
          organizer: ticket.event.organizer
        }
      };

      await generateTicketPDF(ticketData, fullName);
      toast.success("Ticket downloaded successfully");
    } catch (error) {
      console.error("Error downloading ticket:", error);
      toast.error("Failed to download ticket");
    }
  };

  const handleEmailTicket = async (ticket: EventTicket) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('first_name, last_name, email')
        .eq('id', userId)
        .single();

      if (error || !data) {
        toast.error("Could not find your profile information");
        return;
      }

      const fullName = `${data.first_name || ''} ${data.last_name || ''}`.trim() || 'Attendee';

      const ticketData = {
        id: ticket.id,
        ticket_code: ticket.ticket_code,
        event: {
          title: ticket.event.title,
          date: ticket.event.date,
          location: ticket.event.location,
          organizer: ticket.event.organizer
        }
      };

      toast.promise(
        sendTicketByEmail(ticketData, fullName, data.email || ''),
        {
          loading: "Sending ticket to your email...",
          success: "Ticket sent to your email!",
          error: "Failed to send ticket. Please try again."
        }
      );
    } catch (error) {
      console.error("Error emailing ticket:", error);
      toast.error("Failed to send ticket by email");
    }
  };

  if (loading) {
    return <p>Loading your tickets...</p>;
  }

  if (tickets.length === 0) {
    return (
      <Card className="p-8 text-center">
        <div className="flex flex-col items-center space-y-4">
          <Ticket className="h-12 w-12 text-gray-400" />
          <h3 className="text-xl font-medium">No Tickets Found</h3>
          <p className="text-gray-500">You haven't purchased any tickets yet.</p>
          <Button className="bg-event-purple hover:bg-event-purple/90" onClick={() => window.location.href = "/browse"}>
            Browse Events
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Your Tickets</h2>

      {tickets.map(ticket => (
        <Card key={ticket.id} className="overflow-hidden">
          <div className="flex flex-col md:flex-row">
            <div className="md:w-1/4 h-48 md:h-auto">
              <img
                src={ticket.event.imageUrl}
                alt={ticket.event.title}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex-1 p-6">
              <h3 className="text-xl font-semibold mb-2">{ticket.event.title}</h3>

              <div className="flex flex-col space-y-2 mb-4">
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 text-gray-500 mr-2" />
                  <span>{format(new Date(ticket.event.date), "EEEE, MMMM d, yyyy 'at' h:mm a")}</span>
                </div>

                <div className="flex items-center">
                  <MapPin className="h-4 w-4 text-gray-500 mr-2" />
                  <span>{ticket.event.location}</span>
                </div>
              </div>

              <div className="border-t pt-4 flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  className="flex items-center"
                  onClick={() => handleDownloadTicket(ticket)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Ticket
                </Button>

                <Button
                  variant="outline"
                  className="flex items-center"
                  onClick={() => handleEmailTicket(ticket)}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Email Ticket
                </Button>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant={ticket.feedback ? "default" : "outline"}
                      className={`flex items-center ${ticket.feedback ? "bg-green-500 hover:bg-green-600" : ""}`}
                    >
                      {ticket.feedback ? (
                        <>
                          <Star className="h-4 w-4 mr-2 fill-white" />
                          Rating: {ticket.feedback.rating}/5
                        </>
                      ) : (
                        <>
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Leave Feedback
                        </>
                      )}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>{ticket.feedback ? "Update Your Feedback" : "Leave Feedback"}</DialogTitle>
                    </DialogHeader>
                    <FeedbackForm
                      eventId={ticket.event_id}
                      userId={userId}
                      existingFeedback={ticket.feedback}
                      onFeedbackSubmitted={fetchTickets}
                    />
                  </DialogContent>
                </Dialog>

                <div className="ml-auto text-sm bg-gray-100 px-3 py-1 rounded-full">
                  Ticket Code: {ticket.ticket_code}
                </div>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};
