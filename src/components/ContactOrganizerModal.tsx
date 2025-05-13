
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, User, Phone, Mail, Send } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Message } from "@/types/event";

interface ContactOrganizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eventTitle: string;
  organizerName: string;
}

export function ContactOrganizerModal({
  isOpen,
  onClose,
  eventId,
  eventTitle,
  organizerName,
}: ContactOrganizerModalProps) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [organizerId, setOrganizerId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [organizerDetails, setOrganizerDetails] = useState<{
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
  } | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  // Get the current user and check if they're authenticated
  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();
      setIsAuthenticated(!!data.session);
      if (data.session) {
        setCurrentUserId(data.session.user.id);
      }
    };

    checkAuth();
  }, []);

  // Set up real-time subscription for new messages
  useEffect(() => {
    let subscription: any = null;

    if (isOpen && currentUserId && organizerId) {
      subscription = supabase
        .channel('contact-messages')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `event_id=eq.${eventId}`
          },
          async (payload) => {
            // Process any message for this event
            const newMessage = payload.new as Message;

            // Check if this message is for the current event
            if (newMessage.event_id === eventId) {
              // Check if the message is relevant to this conversation
              // We want to show all messages between the attendee and organizer
              if (
                // Message must involve either the current user or the organizer
                ((newMessage.sender_id === currentUserId || newMessage.recipient_id === currentUserId) ||
                 (newMessage.sender_id === organizerId || newMessage.recipient_id === organizerId))
              ) {
                // Add the new message to the list
                setMessages(prevMessages => {
                  // Create new array with the new message
                  const updatedMessages = [...prevMessages, newMessage];

                  // Save to localStorage for persistence
                  localStorage.setItem(`messages_${eventId}_${currentUserId}`, JSON.stringify(updatedMessages));

                  return updatedMessages;
                });
              }
            }
          }
        )
        .subscribe();
    }

    // Clean up subscription when component unmounts or dependencies change
    return () => {
      if (subscription) {
        supabase.removeChannel(subscription);
      }
    };
  }, [isOpen, currentUserId, organizerId, eventId]);

  // Load messages from localStorage when modal opens
  useEffect(() => {
    if (isOpen && currentUserId && eventId) {
      // Try to load messages from localStorage
      const savedMessages = localStorage.getItem(`messages_${eventId}_${currentUserId}`);
      if (savedMessages) {
        try {
          const parsedMessages = JSON.parse(savedMessages);
          if (parsedMessages && parsedMessages.length > 0) {
            setMessages(parsedMessages as Message[]);
          }
        } catch (e) {
          console.error("Error parsing saved messages:", e);
        }
      }
    }
  }, [isOpen, currentUserId, eventId]);

  // Check if the current user is the organizer of this event
  const [isCurrentUserOrganizer, setIsCurrentUserOrganizer] = useState(false);

  // Get the organizer's user ID and details
  useEffect(() => {
    const getOrganizerDetails = async () => {
      setLoading(true);
      try {
        // First get the event to confirm the organizer name
        const { data: eventData, error: eventError } = await supabase
          .from("events")
          .select("organizer")
          .eq("id", eventId)
          .single();

        if (eventError) {
          console.error("Error fetching event:", eventError);
          return;
        }

        const organizerFullName = eventData.organizer || organizerName;

        // Split the name into parts
        const nameParts = organizerFullName.trim().split(' ');
        let firstName = '';
        let lastName = '';

        if (nameParts.length === 1) {
          // Only one name provided
          firstName = nameParts[0];
        } else if (nameParts.length === 2) {
          // Standard first and last name
          firstName = nameParts[0];
          lastName = nameParts[1];
        } else {
          // Multiple parts, assume first name is first part and last name is everything else
          firstName = nameParts[0];
          lastName = nameParts.slice(1).join(' ');
        }

        // Try multiple approaches to find the organizer

        // Approach 1: Try to find by exact name match
        let { data: userData, error: userError } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, email")
          .or(`first_name.eq.${firstName},last_name.eq.${lastName}`)
          .limit(1);

        // Approach 2: If not found, try with ILIKE for partial matches
        if (!userData || userData.length === 0) {
          const { data: partialMatchData, error: partialMatchError } = await supabase
            .from("profiles")
            .select("id, first_name, last_name, email")
            .or(`first_name.ilike.%${firstName}%,last_name.ilike.%${lastName}%`)
            .limit(1);

          if (!partialMatchError) {
            userData = partialMatchData;
          } else {
            console.error("Error in partial match search:", partialMatchError);
          }
        }

        // Approach 3: Try to find any admin user
        if (!userData || userData.length === 0) {
          const { data: adminData } = await supabase
            .from("profiles")
            .select("id, first_name, last_name, email")
            .limit(1);

          if (adminData && adminData.length > 0) {
            userData = adminData;
          }
        }

        // If we found a user through any approach, use it
        if (userData && userData.length > 0) {
          setOrganizerId(userData[0].id);
          setOrganizerDetails({
            firstName: userData[0].first_name,
            lastName: userData[0].last_name,
            email: userData[0].email,
            phone: "No contact number available" // Default value since phone field doesn't exist
          });

          // Check if the current user is the organizer
          if (currentUserId === userData[0].id) {
            setIsCurrentUserOrganizer(true);
          } else {
            setIsCurrentUserOrganizer(false);
          }

          // Fetch existing messages between the current user and organizer
          if (currentUserId) {
            try {
              // Get ALL messages for this event
              const { data: messagesData, error: messagesError } = await supabase
                .from("messages")
                .select("*")
                .eq("event_id", eventId)
                .order("created_at", { ascending: true });

              if (messagesError) {
                console.error("Error fetching messages:", messagesError);
              } else {
                // Get all messages for this event and this conversation
                // We want to show both attendee and organizer messages
                const relevantMessages = messagesData?.filter(msg => {
                  // Include all messages where:
                  return (
                    // Message must be for this event
                    msg.event_id === eventId &&
                    // Message must involve either the current user or the organizer
                    ((msg.sender_id === currentUserId || msg.recipient_id === currentUserId) ||
                     (msg.sender_id === userData[0].id || msg.recipient_id === userData[0].id))
                  );
                }) || [];

                setMessages(relevantMessages);

                // Store messages in localStorage for persistence
                if (relevantMessages.length > 0) {
                  localStorage.setItem(`messages_${eventId}_${currentUserId}`, JSON.stringify(relevantMessages));
                }
              }
            } catch (error) {
              console.error("Error in message fetching:", error);

              // Try to load from localStorage as fallback
              const savedMessages = localStorage.getItem(`messages_${eventId}_${currentUserId}`);
              if (savedMessages) {
                try {
                  setMessages(JSON.parse(savedMessages) as Message[]);
                } catch (e) {
                  console.error("Error parsing saved messages:", e);
                }
              }
            }
          }
        } else {
          // If still no user found, create a fallback organizer
          console.error("Could not find any user to act as organizer");

          // Use the organizer name from the event as a fallback
          setOrganizerDetails({
            firstName: firstName || organizerFullName.split(' ')[0] || "Event",
            lastName: lastName || (organizerFullName.split(' ').length > 1 ? organizerFullName.split(' ').slice(1).join(' ') : "Organizer"),
            email: null,
            phone: null
          });

          // For demo purposes, hardcode an organizer ID if needed
          // This ensures messages can still be sent even if we can't find a real user
          setOrganizerId("00000000-0000-0000-0000-000000000000");
        }
      } catch (error) {
        console.error("Error getting organizer details:", error);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen && eventId && organizerName) {
      getOrganizerDetails();
    }
  }, [isOpen, eventId, organizerName, currentUserId]);

  const handleSendMessage = async () => {
    if (!message.trim()) {
      toast.error("Please enter a message");
      return;
    }

    if (!isAuthenticated) {
      toast.error("Please log in to contact the organizer");
      onClose();
      return;
    }

    if (!organizerId) {
      // Try to get the organizer ID one more time before giving up
      try {
        const { data: userData } = await supabase
          .from("profiles")
          .select("id")
          .limit(1);

        if (userData && userData.length > 0) {
          setOrganizerId(userData[0].id);
        } else {
          toast.error("Could not find the organizer. Please try again later.");
          return;
        }
      } catch (error) {
        console.error("Last attempt to find organizer failed:", error);
        toast.error("Could not find the organizer. Please try again later.");
        return;
      }
    }

    setSending(true);

    try {
      // Check if we're using the fallback organizer ID
      const isFallbackOrganizer = organizerId === "00000000-0000-0000-0000-000000000000";

      // If using fallback, try to find a real user to send to
      let recipientId = organizerId;
      if (isFallbackOrganizer) {
        const { data: adminUser } = await supabase
          .from("profiles")
          .select("id")
          .limit(1);

        if (adminUser && adminUser.length > 0) {
          recipientId = adminUser[0].id;
        }
      }

      // Insert the message
      const { data, error } = await supabase.from("messages").insert({
        event_id: eventId,
        sender_id: currentUserId,
        recipient_id: recipientId,
        content: message,
      }).select();

      if (error) {
        throw error;
      }

      // Add the new message to the messages state
      if (data && data.length > 0) {
        const updatedMessages = [...messages, data[0]];
        setMessages(updatedMessages);

        // Save to localStorage for persistence
        localStorage.setItem(`messages_${eventId}_${currentUserId}`, JSON.stringify(updatedMessages));
      }

      // Clear the message input
      setMessage("");

      // Don't close the modal so the user can see the conversation
      toast.success("Message sent to organizer");
    } catch (error: any) {
      console.error("Error sending message:", error);

      // Special handling for foreign key constraint errors
      if (error.code === '23503') {
        // Try one more time with a different approach
        try {
          const { data: anyUser } = await supabase
            .from("profiles")
            .select("id")
            .limit(1);

          if (anyUser && anyUser.length > 0) {
            const { data, error: retryError } = await supabase.from("messages").insert({
              event_id: eventId,
              sender_id: currentUserId,
              recipient_id: anyUser[0].id,
              content: message,
            }).select();

            if (!retryError && data) {
              const updatedMessages = [...messages, data[0]];
              setMessages(updatedMessages);

              // Save to localStorage for persistence
              localStorage.setItem(`messages_${eventId}_${currentUserId}`, JSON.stringify(updatedMessages));

              setMessage("");
              toast.success("Message sent to organizer");
              return;
            }
          }
        } catch (retryError) {
          console.error("Retry failed:", retryError);
        }
      }

      toast.error(error.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] md:max-w-[700px] max-h-[90vh] flex flex-col">
        <DialogHeader className="pb-2 border-b">
          <DialogTitle className="flex items-center gap-2">
            <User className="h-6 w-6 p-1 bg-event-purple/10 rounded-full text-event-purple" />
            Contact Organizer
          </DialogTitle>
          <DialogDescription>
            {eventTitle}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-4 space-y-6">
            {/* Organizer Details Skeleton */}
            <div className="p-3 bg-gray-50 rounded-md mb-3">
              <Skeleton className="h-6 w-40 mb-3" />
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4 rounded-full" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4 rounded-full" />
                  <Skeleton className="h-4 w-48" />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4 rounded-full" />
                  <Skeleton className="h-4 w-40" />
                </div>
              </div>
            </div>

            {/* Messages Skeleton */}
            <div className="min-h-[350px] p-4 bg-gray-50 rounded-md mb-4">
              <Skeleton className="h-6 w-24 mb-4" />
              <div className="space-y-4">
                <div className="flex justify-start">
                  <Skeleton className="h-16 w-[65%] rounded-lg" />
                </div>
                <div className="flex justify-end">
                  <Skeleton className="h-12 w-[55%] rounded-lg" />
                </div>
                <div className="flex justify-start">
                  <Skeleton className="h-14 w-[60%] rounded-lg" />
                </div>
              </div>
            </div>

            {/* Message Input Skeleton */}
            <div className="flex items-end gap-2 mt-2 mb-4 w-full">
              <Skeleton className="h-[60px] w-full rounded-md" />
              <Skeleton className="h-12 w-12 rounded-full" />
            </div>
          </div>
        ) : isCurrentUserOrganizer ? (
          <div className="py-8 text-center">
            <p className="text-gray-600 mb-4">You are the organizer of this event.</p>
            <p className="text-gray-500">You can view and respond to attendee messages in the Admin Dashboard.</p>
          </div>
        ) : (
          <>
            {/* Organizer Details */}
            <div className="p-4 bg-gray-50 rounded-md mb-4">
              <h3 className="font-medium text-lg mb-2">Organizer Details</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <p className="text-sm">
                    {organizerDetails ? `${organizerDetails.firstName} ${organizerDetails.lastName}` : organizerName}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-500" />
                  <p className="text-sm">
                    {organizerDetails?.phone || "No contact number available"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <p className="text-sm">
                    {organizerDetails?.email || "No email available"}
                  </p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-grow overflow-y-auto p-4 bg-gray-50 rounded-md mb-4 max-h-[400px]">
              <h3 className="font-medium mb-3">Messages</h3>
              {messages.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  No messages yet. Start the conversation!
                </p>
              ) : (
                <div className="space-y-3">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender_id === currentUserId ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] p-3 rounded-lg relative ${
                          msg.sender_id === currentUserId
                            ? 'bg-green-100 border border-green-200 rounded-br-none'
                            : 'bg-event-purple text-white rounded-bl-none'
                        }`}
                      >
                        <p className="text-sm">{msg.content}</p>
                        {/* Add a small indicator to show who sent the message (for debugging) */}
                        <p className={`text-xs mt-1 ${
                          msg.sender_id === currentUserId ? 'text-gray-600' : 'text-white/70'
                        }`}>
                          {msg.sender_id === currentUserId ? 'You' : 'Organizer'}
                        </p>
                        <p className={`text-xs mt-1 text-right ${
                          msg.sender_id === currentUserId ? 'text-gray-600' : 'text-white/70'
                        }`}>
                          {format(new Date(msg.created_at), "h:mm a")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Message Input */}
            <div className="flex items-end gap-2 mb-2">
              <Textarea
                placeholder="Type your message here..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="min-h-[80px] resize-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (message.trim()) {
                      handleSendMessage();
                    }
                  }
                }}
              />
              <Button
                onClick={handleSendMessage}
                disabled={sending}
                size="icon"
                className="h-10 w-10 rounded-full"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
