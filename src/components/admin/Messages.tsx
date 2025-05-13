import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Send, User } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface Message {
  id: string;
  event_id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  sender_name?: string;
  recipient_name?: string;
  event_title?: string;
}

interface Event {
  id: string;
  title: string;
}

export function Messages() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Get current user ID
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        setCurrentUserId(data.session.user.id);
      }
    };

    getCurrentUser();
  }, []);

  // Fetch all events with messages
  useEffect(() => {
    const fetchEvents = async () => {
      if (!currentUserId) return;

      try {
        // First get the user's profile to get their name
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("first_name, last_name")
          .eq("id", currentUserId)
          .single();

        if (profileError) {
          console.error("Error fetching profile:", profileError);
          return;
        }

        if (!profileData) {
          console.error("Profile not found");
          return;
        }

        const fullName = `${profileData.first_name} ${profileData.last_name}`;

        // Get events where the user is the organizer
        const { data: organizerEvents, error: organizerError } = await supabase
          .from("events")
          .select("id, title, organizer")
          .eq("organizer", fullName);

        if (organizerError) {
          console.error("Error fetching organizer events:", organizerError);
        }

        // console.log("Events where user is organizer:", organizerEvents);

        // Get user's role to determine if they should see all messages or just their own
        const { data: userRole } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", currentUserId)
          .single();

        const isAdmin = userRole?.role === 'admin';
        // console.log("User is admin:", isAdmin, "User role:", userRole?.role);

        // Get ALL events to ensure we don't miss any
        const { data: allEvents, error: allEventsError } = await supabase
          .from("events")
          .select("id, title");

        if (allEventsError) {
          throw allEventsError;
        }

        // Log all events for debugging
        // console.log("All events:", allEvents);

        // Get ALL messages to see what event_ids are being used
        const { data: allMessages, error: allMessagesError } = await supabase
          .from("messages")
          .select("event_id, sender_id, recipient_id");

        if (allMessagesError) {
          console.error("Error fetching all messages:", allMessagesError);
        } else {
          // console.log("All messages with event_ids:", allMessages);
        }

        // Get all events with their organizers
        const { data: eventsWithOrganizers, error: eventsOrgError } = await supabase
          .from("events")
          .select("id, title, organizer");

        if (eventsOrgError) {
          console.error("Error fetching events with organizers:", eventsOrgError);
        } else {
          // console.log("Events with organizers:", eventsWithOrganizers);
        }

        // Find events where the current user is the organizer
        const eventsAsOrganizer = eventsWithOrganizers?.filter(event =>
          event.organizer === fullName
        ) || [];

        // console.log("Events where user is organizer by name match:", eventsAsOrganizer);

        // Get all messages to find events where the user should see messages
        const { data: allMessagesForUser, error: allMsgError } = await supabase
          .from("messages")
          .select("event_id, sender_id, recipient_id, content");

        if (allMsgError) {
          console.error("Error fetching all messages for user:", allMsgError);
        }

        // For each event, determine if the user should see messages for it
        const eventsToShow = new Set<string>();

        // First add all events where user is the organizer
        eventsAsOrganizer.forEach(event => {
          eventsToShow.add(event.id);
        });

        // Check if user is an organizer (only organizers should see messages in admin section)
        const isUserOrganizer = eventsAsOrganizer.length > 0;
        // console.log("Is user an organizer of any event?", isUserOrganizer);

        // If user is not an organizer, don't show any messages in admin section
        if (!isUserOrganizer) {
          // console.log("User is not an organizer, not showing any messages in admin section");
          // Clear the events to show
          eventsToShow.clear();
        } else {
          // Only for organizers: check messages to find events where they should see messages
          if (allMessagesForUser) {
            allMessagesForUser.forEach(msg => {
              // If user is the organizer of the event, add the event
              const eventOrganizer = eventsWithOrganizers?.find(e => e.id === msg.event_id)?.organizer;
              if (eventOrganizer === fullName) {
                eventsToShow.add(msg.event_id);
              }
            });
          }
        }

        // console.log("Events to show for this user:", Array.from(eventsToShow));

        // Get messages for events where user is organizer (even if not directly involved in the message)
        let organizerMessageEvents: any[] = [];

        // We already have isUserOrganizer defined above, so we'll reuse it here

        if (isUserOrganizer) {
          for (const eventId of eventsToShow) {
            const eventOrganizer = eventsWithOrganizers?.find(e => e.id === eventId)?.organizer;

            // If user is the organizer of this event, get all messages for this event
            if (eventOrganizer === fullName) {
              const { data: eventMessages, error: eventMsgError } = await supabase
                .from("messages")
                .select("event_id, content")
                .eq("event_id", eventId);

              if (eventMsgError) {
                console.error(`Error fetching messages for event ${eventId}:`, eventMsgError);
              } else if (eventMessages) {
                organizerMessageEvents = [...organizerMessageEvents, ...eventMessages];
              }
            }
          }

          // console.log("Messages for events where user is organizer:", organizerMessageEvents);
        } else {
          // console.log("User is not an organizer, not fetching any messages");
        }

        // For non-organizers, we don't want to show any messages in the admin section
        // So we'll skip fetching messages where they are sender or recipient

        // Combine all message events - for organizers only
        const messageEvents = isUserOrganizer ? [...(organizerMessageEvents || [])] : [];
        // console.log("Combined message events:", messageEvents);

        // If there are message events, create custom event objects for them
        let eventsWithMessages: Event[] = [];
        if (messageEvents && messageEvents.length > 0) {
          // Manually create a distinct list of event IDs
          const uniqueEventIds = Array.from(
            new Set(messageEvents.map(msg => msg.event_id))
          );

          // console.log("Unique event IDs from messages:", uniqueEventIds);

          // First try to match with existing events
          const matchedEvents = allEvents.filter(event =>
            uniqueEventIds.includes(event.id)
          );

          // For any event_ids that don't match existing events, create custom event objects
          const unmatchedEventIds = uniqueEventIds.filter(id =>
            !allEvents.some(event => event.id === id)
          );

          // console.log("Unmatched event IDs:", unmatchedEventIds);

          // Create custom event objects for unmatched event IDs
          const customEvents = unmatchedEventIds.map(id => ({
            id: id,
            title: id.startsWith('event-') ? `Event ${id.split('-')[1]}` : `Event ${id}`
          }));

          eventsWithMessages = [...matchedEvents, ...customEvents];
        }

        // Combine and deduplicate events
        const combinedEvents = [
          ...(organizerEvents || []),
          ...eventsWithMessages
        ];

        const uniqueEvents = Array.from(
          new Map(combinedEvents.map(event => [event.id, event])).values()
        );

        // console.log("Events with messages:", uniqueEvents);
        setEvents(uniqueEvents);

        // If no event is selected but we have events, select the first one
        if (!selectedEventId && uniqueEvents.length > 0) {
          setSelectedEventId(uniqueEvents[0].id);
        }
      } catch (error) {
        console.error("Error fetching events:", error);
      }
    };

    fetchEvents();

    // Set up a subscription to refresh events when new messages arrive
    const subscription = supabase
      .channel('public:messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages'
      }, (payload) => {
        // console.log('New message detected, refreshing events:', payload);
        fetchEvents();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [currentUserId, selectedEventId]);

  // Fetch messages for selected event and set up real-time subscription
  useEffect(() => {
    let subscription: any = null;

    const fetchMessages = async () => {
      if (!currentUserId || !selectedEventId) {
        setLoading(false);
        return;
      }

      setLoading(true);

      // console.log("Fetching messages for event ID:", selectedEventId);

      try {
        // First check if the user is the organizer of this event
        const { data: eventData, error: eventError } = await supabase
          .from("events")
          .select("organizer")
          .eq("id", selectedEventId)
          .single();

        if (eventError) {
          console.error("Error checking if user is organizer:", eventError);
        }

        // Get user's full name
        const { data: profileData } = await supabase
          .from("profiles")
          .select("first_name, last_name")
          .eq("id", currentUserId)
          .single();

        const fullName = profileData ? `${profileData.first_name} ${profileData.last_name}` : "";
        const isOrganizer = eventData?.organizer === fullName;

        // console.log("Is user the organizer of this event?", isOrganizer, "User:", fullName, "Organizer:", eventData?.organizer);

        let data;
        let error;

        if (isOrganizer) {
          // If user is the organizer, get ALL messages for this event
          const result = await supabase
            .from("messages")
            .select("*")
            .eq("event_id", selectedEventId)
            .order("created_at", { ascending: false });

          data = result.data;
          error = result.error;
        } else {
          // For non-organizers, don't show any messages in the admin section
          data = [];
          error = null;
          // console.log("User is not an organizer, not showing any messages in admin section");
        }

        // console.log("Messages found for this event:", data);

        if (error) {
          throw error;
        }

        // Get user details for each message
        const messagesWithNames = await Promise.all(
          (data || []).map(async (message) => {
            // Get sender name
            const { data: senderData } = await supabase
              .from("profiles")
              .select("first_name, last_name")
              .eq("id", message.sender_id)
              .single();

            // Get recipient name
            const { data: recipientData } = await supabase
              .from("profiles")
              .select("first_name, last_name")
              .eq("id", message.recipient_id)
              .single();

            // Get event title
            const { data: eventData } = await supabase
              .from("events")
              .select("title")
              .eq("id", message.event_id)
              .single();

            return {
              ...message,
              sender_name: senderData
                ? `${senderData.first_name} ${senderData.last_name}`
                : "Unknown User",
              recipient_name: recipientData
                ? `${recipientData.first_name} ${recipientData.last_name}`
                : "Unknown User",
              event_title: eventData ? eventData.title : "Unknown Event",
            };
          })
        );

        setMessages(messagesWithNames);
      } catch (error) {
        console.error("Error fetching messages:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();

    // Set up real-time subscription for new messages
    if (currentUserId && selectedEventId) {
      // For real-time subscriptions, we need to listen to all messages and filter manually
      // because the filter might not work correctly with the event ID format
      subscription = supabase
        .channel('messages-changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages'
          },
          async (payload) => {
            // console.log('New message received:', payload);

            // Process the message if it's for the selected event
            const newMessage = payload.new;

            // Check if this is for the selected event
            if (newMessage.event_id === selectedEventId) {
              // Check if user is the organizer of this event
              const { data: eventData } = await supabase
                .from("events")
                .select("organizer")
                .eq("id", selectedEventId)
                .single();

              // Get user's full name
              const { data: profileData } = await supabase
                .from("profiles")
                .select("first_name, last_name")
                .eq("id", currentUserId)
                .single();

              const fullName = profileData ? `${profileData.first_name} ${profileData.last_name}` : "";
              const isOrganizer = eventData?.organizer === fullName;

              // Only process if user is the organizer (attendees shouldn't see messages in admin section)
              if (isOrganizer) {
              // Get sender name
              const { data: senderData } = await supabase
                .from("profiles")
                .select("first_name, last_name")
                .eq("id", newMessage.sender_id)
                .single();

              // Get recipient name
              const { data: recipientData } = await supabase
                .from("profiles")
                .select("first_name, last_name")
                .eq("id", newMessage.recipient_id)
                .single();

              // Get event title
              const { data: eventData } = await supabase
                .from("events")
                .select("title")
                .eq("id", newMessage.event_id)
                .single();

              const messageWithNames = {
                ...newMessage,
                sender_name: senderData
                  ? `${senderData.first_name} ${senderData.last_name}`
                  : "Unknown User",
                recipient_name: recipientData
                  ? `${recipientData.first_name} ${recipientData.last_name}`
                  : "Unknown User",
                event_title: eventData ? eventData.title : "Unknown Event",
              };

              // Add the new message to the list
              setMessages(prevMessages => [messageWithNames, ...prevMessages]);
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
  }, [currentUserId, selectedEventId]);

  // Mark message as read when selected
  useEffect(() => {
    const markAsRead = async () => {
      if (selectedMessage && !selectedMessage.is_read && selectedMessage.recipient_id === currentUserId) {
        try {
          await supabase
            .from("messages")
            .update({ is_read: true })
            .eq("id", selectedMessage.id);

          // Update the local state
          setMessages((prevMessages) =>
            prevMessages.map((msg) =>
              msg.id === selectedMessage.id ? { ...msg, is_read: true } : msg
            )
          );
        } catch (error) {
          console.error("Error marking message as read:", error);
        }
      }
    };

    markAsRead();
  }, [selectedMessage, currentUserId]);

  const handleSendReply = async () => {
    if (!replyContent.trim() || !selectedMessage || !currentUserId) {
      toast.error("Please enter a message");
      return;
    }

    setSending(true);

    try {
      // Determine the recipient (the other person in the conversation)
      const recipientId = selectedMessage.sender_id === currentUserId
        ? selectedMessage.recipient_id
        : selectedMessage.sender_id;

      // Insert the reply
      const { data, error } = await supabase
        .from("messages")
        .insert({
          event_id: selectedMessage.event_id,
          sender_id: currentUserId,
          recipient_id: recipientId,
          content: replyContent,
        })
        .select();

      if (error) {
        throw error;
      }

      // Get sender name
      const { data: senderData } = await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", currentUserId)
        .single();

      // Get recipient name
      const { data: recipientData } = await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", recipientId)
        .single();

      // Add the new message to the list
      if (data && data.length > 0) {
        const newMessage = {
          ...data[0],
          sender_name: senderData
            ? `${senderData.first_name} ${senderData.last_name}`
            : "Unknown User",
          recipient_name: recipientData
            ? `${recipientData.first_name} ${recipientData.last_name}`
            : "Unknown User",
          event_title: selectedMessage.event_title,
        };

        setMessages([newMessage, ...messages]);
      }

      setReplyContent("");
      toast.success("Reply sent");
    } catch (error: any) {
      console.error("Error sending reply:", error);
      toast.error(error.message || "Failed to send reply");
    } finally {
      setSending(false);
    }
  };

  // Group messages by conversation partner (attendee)
  const groupMessagesByConversation = () => {
    // Create a map to store the latest message for each conversation
    const conversationMap = new Map();

    // Process all messages
    messages.forEach(message => {
      // Determine the conversation partner (the other person)
      const partnerId = message.sender_id === currentUserId
        ? message.recipient_id
        : message.sender_id;

      const partnerName = message.sender_id === currentUserId
        ? message.recipient_name
        : message.sender_name;

      // Create a unique key for this conversation
      const conversationKey = `${partnerId}-${message.event_id}`;

      // Check if we already have a message for this conversation
      const existingMessage = conversationMap.get(conversationKey);

      // If no message exists for this conversation or this message is newer, update the map
      if (!existingMessage || new Date(message.created_at) > new Date(existingMessage.created_at)) {
        // Add a property to identify the conversation partner
        conversationMap.set(conversationKey, {
          ...message,
          conversationPartnerId: partnerId,
          conversationPartnerName: partnerName
        });
      }
    });

    // Convert the map values to an array and sort by created_at (newest first)
    return Array.from(conversationMap.values())
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  };

  // Get grouped conversations
  const groupedConversations = groupMessagesByConversation();

  // Filter conversations based on search query
  const filteredMessages = groupedConversations.filter((message) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      message.content.toLowerCase().includes(searchLower) ||
      message.sender_name?.toLowerCase().includes(searchLower) ||
      message.recipient_name?.toLowerCase().includes(searchLower) ||
      message.conversationPartnerName?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
        <div className="w-full md:w-1/3">
          <Select
            value={selectedEventId}
            onValueChange={setSelectedEventId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select an event" />
            </SelectTrigger>
            <SelectContent>
              {events.map((event) => (
                <SelectItem key={event.id} value={event.id}>
                  {event.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedEventId && (
          <div className="w-full md:w-2/3">
            <Input
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        )}
      </div>

      {!selectedEventId && (
        <div className="text-center py-8">
          <h3 className="text-lg font-medium">Select an event to view messages</h3>
          <p className="text-gray-500">You'll see messages from attendees here</p>
        </div>
      )}

      {selectedEventId && loading && (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-event-purple" />
        </div>
      )}

      {selectedEventId && !loading && filteredMessages.length === 0 && (
        <div className="text-center py-8">
          <h3 className="text-lg font-medium">No messages found</h3>
          <p className="text-gray-500">
            There are no messages for this event yet
          </p>
        </div>
      )}

      {selectedEventId && !loading && filteredMessages.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 space-y-4">
            <h3 className="font-medium">Conversations</h3>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {filteredMessages.map((message) => (
                <div
                  key={message.id}
                  className={`p-3 rounded-md cursor-pointer ${
                    selectedMessage?.id === message.id
                      ? "bg-event-purple/10 border border-event-purple/30"
                      : "bg-gray-100 hover:bg-gray-200"
                  } ${
                    !message.is_read && message.recipient_id === currentUserId
                      ? "border-l-4 border-l-event-purple"
                      : ""
                  }`}
                  onClick={() => setSelectedMessage(message)}
                >
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-500" />
                    <p className="font-medium truncate">
                      {message.conversationPartnerName}
                    </p>
                  </div>
                  <p className="text-sm text-gray-500 truncate mt-1">
                    {message.content}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {format(new Date(message.created_at), "MMM d, yyyy h:mm a")}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="md:col-span-2">
            {selectedMessage ? (
              <Card className="flex flex-col h-[600px]">
                <CardHeader className="pb-2 border-b">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="h-8 w-8 p-1 bg-event-purple/10 rounded-full text-event-purple" />
                    {selectedMessage.sender_id === currentUserId
                      ? selectedMessage.recipient_name
                      : selectedMessage.sender_name}
                  </CardTitle>
                  <CardDescription>
                    {selectedMessage.event_title}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-grow overflow-y-auto p-4 space-y-4 bg-gray-50">
                  {/* WhatsApp-like chat interface */}
                  <div className="flex flex-col space-y-4">
                    {messages
                      .filter(msg =>
                        // Include all messages in the same conversation
                        (
                          // Same event
                          msg.event_id === selectedMessage.event_id &&
                          // Same conversation participants (in either direction)
                          (
                            // Either the current message matches the selected message exactly
                            (msg.sender_id === selectedMessage.sender_id && msg.recipient_id === selectedMessage.recipient_id) ||
                            (msg.sender_id === selectedMessage.recipient_id && msg.recipient_id === selectedMessage.sender_id) ||
                            // Or the current message involves the same two people as the selected message
                            (
                              (msg.sender_id === selectedMessage.sender_id || msg.sender_id === selectedMessage.recipient_id) &&
                              (msg.recipient_id === selectedMessage.sender_id || msg.recipient_id === selectedMessage.recipient_id)
                            )
                          )
                        )
                      )
                      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                      .map(message => (
                        <div
                          key={message.id}
                          className={`flex ${message.sender_id === currentUserId ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[80%] p-3 rounded-lg relative ${
                              message.sender_id === currentUserId
                                ? 'bg-event-purple text-white rounded-br-none'
                                : 'bg-green-100 border border-green-200 rounded-bl-none'
                            }`}
                          >
                            <p className="text-sm">{message.content}</p>
                            <p className={`text-xs mt-1 text-right ${
                              message.sender_id === currentUserId ? 'text-white/70' : 'text-gray-600'
                            }`}>
                              {format(new Date(message.created_at), "h:mm a")}
                            </p>
                          </div>
                        </div>
                      ))
                    }
                  </div>
                </CardContent>
                <div className="p-4 border-t bg-white">
                  <div className="flex items-end gap-2">
                    <Textarea
                      placeholder="Type a message..."
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      className="min-h-[60px] resize-none"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          if (replyContent.trim()) {
                            handleSendReply();
                          }
                        }
                      }}
                    />
                    <Button
                      onClick={handleSendReply}
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
                </div>
              </Card>
            ) : (
              <div className="flex items-center justify-center h-[600px] bg-gray-50 rounded-md p-8">
                <div className="text-center">
                  <User className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500">
                    Select a conversation to view and reply
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
export default Messages;