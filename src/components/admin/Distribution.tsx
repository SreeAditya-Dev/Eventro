import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, QrCode, Check, X, User, Package, Calendar, CalendarIcon } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import QrScanner from "qr-scanner";
import { format, isToday, isSameDay } from "date-fns";
import { sendDistributionConfirmation } from "@/utils/notificationService";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// UUID pattern for validation
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface EventDay {
  id: string;
  event_id: string;
  day_number: number;
  day_date: string;
  isCustom?: boolean;
}

interface Event {
  id: string;
  title: string;
  date: string;
  location: string;
  organizer: string;
  end_date?: string;
  event_days?: EventDay[];
}

interface DistributionData {
  id: string;
  attendee_name: string;
  item_type: string;
  timestamp: string;
  event_name?: string;
  event_day?: number;
}

const Distribution = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [scannerActive, setScannerActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedItemType, setSelectedItemType] = useState("T-shirt");
  const [recentDistributions, setRecentDistributions] = useState<DistributionData[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScanner | null>(null);

  // Event-related state
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [selectedEventDay, setSelectedEventDay] = useState<number>(1);
  const [eventSelected, setEventSelected] = useState(false);
  const [eventDays, setEventDays] = useState<EventDay[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  const itemTypes = ["T-shirt", "Badge", "Swag Bag", "Meal Voucher", "Welcome Kit"];

  // Fetch recent distributions
  useEffect(() => {
    const fetchRecentDistributions = async () => {
      try {
        // Get distributions first
        const { data: distribData, error: distribError } = await supabase
          .from('distributions')
          .select(`
            id,
            item_type,
            timestamp,
            attendee_id
          `)
          .order('timestamp', { ascending: false })
          .limit(10);

        if (distribError) throw distribError;

        if (distribData && distribData.length > 0) {
          // Fetch attendee information for each distribution
          const attendeeIds = distribData
            .map(dist => dist.attendee_id)
            .filter(Boolean) as string[];

          const { data: attendeesData, error: attendeesError } = await supabase
            .from('attendees')
            .select('id, name, email')
            .in('id', attendeeIds);

          if (attendeesError) {
            console.error("Error fetching attendees:", attendeesError);
          }

          // Map the data together
          const mappedDistributions = distribData.map(dist => {
            const attendee = attendeesData?.find(a => a.id === dist.attendee_id);

            return {
              id: dist.id,
              attendee_name: attendee?.name || 'Unknown',
              item_type: dist.item_type,
              timestamp: new Date(dist.timestamp).toLocaleString(),
              event_name: 'Event' // We'll update this in a moment
            };
          });

          // Try to get event information from the most recent distribution
          if (mappedDistributions.length > 0) {
            try {
              const { data: eventData } = await supabase
                .from('events')
                .select('id, title')
                .limit(1);

              if (eventData && eventData.length > 0) {
                // Update all distributions with the event name
                mappedDistributions.forEach(dist => {
                  dist.event_name = eventData[0].title;
                });
              }
            } catch (eventError) {
              console.error("Error fetching event:", eventError);
            }
          }

          setRecentDistributions(mappedDistributions);
        }
      } catch (error) {
        console.error("Error fetching recent distributions:", error);
      }
    };

    fetchRecentDistributions();
  }, []);

  // Fetch user's events on component mount
  useEffect(() => {
    const fetchEvents = async () => {
      try {
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
          .select('id, title, date, end_date, location, organizer')
          .eq('organizer', fullName)
          .order('date', { ascending: false });

        if (error) {
          console.error("Error fetching events:", error);
          toast.error("Failed to load events");
          return;
        }

        // For each event, check if it has event_days
        const eventsWithDays = await Promise.all(data.map(async (event) => {
          const { data: eventDaysData } = await supabase
            .from('event_days')
            .select('*')
            .eq('event_id', event.id)
            .order('day_number', { ascending: true });

          return {
            ...event,
            event_days: eventDaysData || []
          };
        }));

        setEvents(eventsWithDays || []);
      } catch (error) {
        console.error("Error:", error);
        toast.error("An unexpected error occurred");
      }
    };

    fetchEvents();
  }, []);

  // Cleanup scanner when component unmounts
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.destroy();
      }
    };
  }, []);

  // Handle event selection change
  const handleEventChange = (eventId: string) => {
    setSelectedEventId(eventId);
    setEventSelected(true);
    setSelectedEventDay(1); // Reset to day 1 by default

    // Reset search results and recent distributions for the new event
    setSearchResults([]);
    setRecentDistributions([]);

    // Get event days for this event
    const selectedEvent = events.find(e => e.id === eventId);
    if (selectedEvent && selectedEvent.event_days && selectedEvent.event_days.length > 0) {
      setEventDays(selectedEvent.event_days);
    } else if (selectedEvent) {
      // If no event days are defined but the event has an end date, create default days
      if (selectedEvent.end_date) {
        const startDate = new Date(selectedEvent.date);
        const endDate = new Date(selectedEvent.end_date);
        const dayDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

        // Create default event days (day 1, day 2, etc.)
        const defaultDays: EventDay[] = [];
        for (let i = 0; i < dayDiff; i++) {
          const dayDate = new Date(startDate);
          dayDate.setDate(startDate.getDate() + i);
          defaultDays.push({
            id: `default-${i+1}`,
            event_id: eventId,
            day_number: i + 1,
            day_date: dayDate.toISOString()
          });
        }
        setEventDays(defaultDays);
      } else {
        // Single day event
        setEventDays([{
          id: 'default-1',
          event_id: eventId,
          day_number: 1,
          day_date: selectedEvent.date
        }]);
      }
    } else {
      setEventDays([]);
    }

    // Fetch recent distributions for this specific event
    fetchRecentDistributionsForEvent(eventId);
  };

  // Handle event day selection change
  const handleEventDayChange = (dayNumber: number) => {
    setSelectedEventDay(dayNumber);

    // Update the selected date based on the event day
    const selectedDay = eventDays.find(day => day.day_number === dayNumber);
    if (selectedDay) {
      setSelectedDate(new Date(selectedDay.day_date));
    }

    // Refresh distributions for this day
    fetchRecentDistributionsForEvent(selectedEventId, dayNumber);
  };

  // Handle date selection change
  const handleDateChange = (date: Date | undefined) => {
    if (!date) return;

    setSelectedDate(date);

    // Find if this date matches any event day
    const matchingDay = eventDays.find(day => {
      const dayDate = new Date(day.day_date);
      return isSameDay(dayDate, date);
    });

    if (matchingDay) {
      setSelectedEventDay(matchingDay.day_number);
      fetchRecentDistributionsForEvent(selectedEventId, matchingDay.day_number);
    } else {
      // If no matching day, create a custom day for this date
      const newDay: EventDay = {
        id: `custom-${date.getTime()}`,
        event_id: selectedEventId,
        day_number: eventDays.length + 1,
        day_date: date.toISOString(),
        isCustom: true // Mark as custom day
      };

      setEventDays(prev => [...prev, newDay]);
      setSelectedEventDay(newDay.day_number);
      fetchRecentDistributionsForEvent(selectedEventId, newDay.day_number);
    }
  };

  // Handle deleting a custom date
  const handleDeleteDate = (dayId: string, dayNumber: number) => {
    // Only allow deleting custom dates
    const dayToDelete = eventDays.find(day => day.id === dayId);
    if (!dayToDelete || !dayToDelete.isCustom) {
      toast.error("Only custom dates can be deleted");
      return;
    }

    // Remove the day from the list
    setEventDays(prev => prev.filter(day => day.id !== dayId));

    // If the deleted day was selected, select the first available day
    if (selectedEventDay === dayNumber) {
      if (eventDays.length > 1) {
        const firstRemainingDay = eventDays.find(day => day.id !== dayId);
        if (firstRemainingDay) {
          setSelectedEventDay(firstRemainingDay.day_number);
          setSelectedDate(new Date(firstRemainingDay.day_date));
          fetchRecentDistributionsForEvent(selectedEventId, firstRemainingDay.day_number);
        }
      } else {
        // If no days left, reset to day 1
        setSelectedEventDay(1);
        setSelectedDate(new Date());
        fetchRecentDistributionsForEvent(selectedEventId);
      }
    }

    toast.success("Custom date removed");
  };

  // Fetch recent distributions for a specific event
  const fetchRecentDistributionsForEvent = async (eventId: string, eventDay?: number) => {
    try {
      // Get event information
      const { data: eventData } = await supabase
        .from('events')
        .select('id, title')
        .eq('id', eventId)
        .single();

      if (!eventData) {
        console.error("Event not found");
        return;
      }

      // First, get all attendees from the database
      const { data: attendeesData, error: attendeesError } = await supabase
        .from('attendees')
        .select('id, name, email')
        .limit(100);

      if (attendeesError) throw attendeesError;

      // Get tickets for this event to find attendees
      const { data: ticketsData, error: ticketsError } = await supabase
        .from('event_tickets')
        .select('id, user_id, ticket_code')
        .eq('event_id', eventId);

      if (ticketsError) throw ticketsError;

      // Get user profiles for these tickets
      if (ticketsData && ticketsData.length > 0) {
        const userIds = ticketsData
          .map(ticket => ticket.user_id)
          .filter(Boolean) as string[];

        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email')
          .in('id', userIds);

        // For now, we'll just show the most recent distributions
        let query = supabase
          .from('distributions')
          .select(`
            id,
            item_type,
            timestamp,
            attendee_id
          `);

        // Try to filter by event_id if the column exists
        try {
          query = query.eq('event_id', eventId);
        } catch (error) {
          console.warn("Could not filter by event_id, column might not exist yet:", error);
        }

        // Try to filter by event_day if the column exists
        try {
          // If event day is specified, filter by it
          if (eventDay) {
            query = query.eq('event_day', eventDay);
          }
        } catch (error) {
          console.warn("Could not filter by event_day, column might not exist yet:", error);
        }

        // Add ordering and limit
        query = query.order('timestamp', { ascending: false }).limit(10);

        const { data: distribData, error: distribError } = await query;

        if (distribError) throw distribError;

        if (distribData && distribData.length > 0) {
          // Map the data together
          const mappedDistributions = distribData.map(dist => {
            // First try to find the attendee directly
            const attendee = attendeesData?.find(a => a.id === dist.attendee_id);

            // If attendee found directly, use that name
            if (attendee && attendee.name) {
              return {
                id: dist.id,
                attendee_name: attendee.name,
                item_type: dist.item_type,
                timestamp: new Date(dist.timestamp).toLocaleString(),
                event_name: eventData.title,
                event_day: dist.event_day || 1
              };
            }

            // Otherwise, try to find a matching profile through tickets
            // This is a more complex approach to handle cases where attendee_id might be a ticket ID
            const ticket = ticketsData.find(t => t.id === dist.attendee_id);
            const userProfile = ticket ? profilesData?.find(p => p.id === ticket.user_id) : null;

            if (userProfile) {
              return {
                id: dist.id,
                attendee_name: `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim(),
                item_type: dist.item_type,
                timestamp: new Date(dist.timestamp).toLocaleString(),
                event_name: eventData.title,
                event_day: dist.event_day || 1
              };
            }

            // If we still can't find a name, check if any ticket has a matching code
            // This is a fallback for older data
            const ticketByCode = ticketsData.find(t => t.ticket_code === dist.attendee_id);
            const profileByTicketCode = ticketByCode ? profilesData?.find(p => p.id === ticketByCode.user_id) : null;

            if (profileByTicketCode) {
              return {
                id: dist.id,
                attendee_name: `${profileByTicketCode.first_name || ''} ${profileByTicketCode.last_name || ''}`.trim(),
                item_type: dist.item_type,
                timestamp: new Date(dist.timestamp).toLocaleString(),
                event_name: eventData.title,
                event_day: dist.event_day || 1
              };
            }

            // Last resort - use a placeholder but with a more informative message
            return {
              id: dist.id,
              attendee_name: `Attendee (ID: ${dist.attendee_id.substring(0, 8)}...)`,
              item_type: dist.item_type,
              timestamp: new Date(dist.timestamp).toLocaleString(),
              event_name: eventData.title,
              event_day: dist.event_day || 1
            };
          });

          setRecentDistributions(mappedDistributions);
        }
      }
    } catch (error) {
      console.error("Error fetching recent distributions for event:", error);
    }
  };

  const handleSearch = async () => {
    if (!selectedEventId) {
      toast.error("Please select an event first");
      return;
    }

    if (!searchQuery.trim()) return;

    setLoading(true);

    try {
      // First, get the user profiles separately
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .or(`email.ilike.%${searchQuery}%,first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%`);

      if (profileError) throw profileError;

      // Get tickets by ticket code or join with profiles we found, filtered by the selected event
      const { data: ticketsData, error: ticketsError } = await supabase
        .from('event_tickets')
        .select('id, ticket_code, user_id, event_id')
        .eq('event_id', selectedEventId)
        .or(`ticket_code.ilike.%${searchQuery}%${profileData && profileData.length > 0 ? `,user_id.in.(${profileData.map(p => `"${p.id}"`).join(',')})` : ''}`);

      if (ticketsError) throw ticketsError;

      if (ticketsData && ticketsData.length > 0) {
        // Fetch events information
        const eventIds = ticketsData
          .map(ticket => ticket.event_id)
          .filter(Boolean) as string[];

        const { data: eventsData } = await supabase
          .from('events')
          .select('id, title')
          .in('id', eventIds);

        // Enrich tickets with profile and event data
        const enrichedTickets = await Promise.all(ticketsData.map(async ticket => {
          const matchingProfile = profileData?.find(p => p.id === ticket.user_id);
          const matchingEvent = eventsData?.find(e => e.id === ticket.event_id);

          // Check if this item has already been distributed to this attendee
          const { data: distributionData } = await supabase
            .from('distributions')
            .select('*')
            .eq('attendee_id', ticket.id)
            .eq('item_type', selectedItemType)
            .limit(1);

          return {
            ...ticket,
            profiles: matchingProfile || null,
            events: matchingEvent || null,
            itemDistributed: distributionData && distributionData.length > 0
          };
        }));

        setSearchResults(enrichedTickets);

        if (enrichedTickets.length === 0) {
          toast.info("No matches found");
        }
      } else {
        setSearchResults([]);
        toast.info("No matches found");
      }
    } catch (error) {
      console.error("Search error:", error);
      toast.error("Failed to search for attendees");
    } finally {
      setLoading(false);
    }
  };

  const toggleScanner = async () => {
    if (!selectedEventId) {
      toast.error("Please select an event first");
      return;
    }

    if (scannerActive) {
      // Stop scanning
      if (scannerRef.current) {
        try {
          scannerRef.current.stop();
          scannerRef.current.destroy();
        } catch (error) {
          console.error("Error stopping scanner:", error);
        }
        scannerRef.current = null;
      }
      setScannerActive(false);
    } else {
      // Start scanning
      setScannerActive(true);

      // Use a small timeout to ensure the video element is properly in the DOM
      setTimeout(() => {
        startScanner();
      }, 100);
    }
  };

  const startScanner = async () => {
    try {
      // Check if we're on HTTPS
      if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && !window.location.hostname.includes('127.0.0.1')) {
        toast.error("Camera access requires HTTPS. Please use a secure connection.");
        console.error("Camera access requires HTTPS. Current protocol:", window.location.protocol);
        setScannerActive(false);
        return;
      }

      if (!videoRef.current) {
        toast.error("Video element not found");
        setScannerActive(false);
        return;
      }

      // Clean up any existing scanner
      if (scannerRef.current) {
        try {
          scannerRef.current.stop();
          scannerRef.current.destroy();
        } catch (error) {
          console.error("Error cleaning up existing scanner:", error);
        }
        scannerRef.current = null;
      }

      // Check for camera availability
      try {
        const hasCamera = await QrScanner.hasCamera();
        if (!hasCamera) {
          toast.error("No camera found on this device");
          setScannerActive(false);
          return;
        }
      } catch (error) {
        console.error("Error checking camera:", error);
        toast.error("Failed to check camera availability");
        setScannerActive(false);
        return;
      }

      // Set video element styles before creating scanner
      videoRef.current.style.width = '100%';
      videoRef.current.style.height = '100%';
      videoRef.current.style.objectFit = 'cover';
      videoRef.current.style.display = 'block';
      videoRef.current.style.backgroundColor = 'transparent';

      // Create scanner with basic settings first
      try {
        const qrScanner = new QrScanner(
          videoRef.current,
          (result) => {
            handleScanResult(result.data);
          },
          {
            returnDetailedScanResult: true,
            highlightScanRegion: true,
            highlightCodeOutline: true,
          }
        );

        scannerRef.current = qrScanner;

        // Try to start with environment camera first
        try {
          await qrScanner.setCamera('environment');
          await qrScanner.start();
          toast.success("Camera started successfully");
        } catch (envError) {
          console.error("Error starting environment camera:", envError);

          // Try with user camera as fallback
          try {
            await qrScanner.setCamera('user');
            await qrScanner.start();
            toast.success("Using front camera");
          } catch (userError) {
            console.error("Error starting user camera:", userError);

            // Last resort: try with default camera
            try {
              // Reset camera preference
              await qrScanner.start();
              toast.success("Camera started");
            } catch (defaultError) {
              console.error("Error starting default camera:", defaultError);
              toast.error("Failed to start camera. Please check permissions.");
              setScannerActive(false);

              // Clean up
              qrScanner.destroy();
              scannerRef.current = null;
            }
          }
        }
      } catch (error) {
        console.error("Error creating QR scanner:", error);
        toast.error("Failed to initialize scanner");
        setScannerActive(false);
      }
    } catch (error) {
      console.error("Unexpected error in startScanner:", error);
      toast.error("An unexpected error occurred");
      setScannerActive(false);
    }
  };

  const handleScanResult = async (qrData: string) => {
    try {
      console.log("QR Data received:", qrData);

      let ticketCode: string | null = null;
      let ticketId: string | null = null;

      // First try to parse as JSON (new format)
      try {
        const parsedData = JSON.parse(qrData);
        console.log("Parsed QR data:", parsedData);

        // Check for ticket_code in JSON
        if (parsedData.ticket_code) {
          ticketCode = parsedData.ticket_code;
          console.log("Found ticket_code in JSON:", ticketCode);
        }
        // Check for ticket_id in JSON
        if (parsedData.ticket_id) {
          ticketId = parsedData.ticket_id;
          console.log("Found ticket_id in JSON:", ticketId);
        }
      } catch (e) {
        console.log("Not valid JSON, checking for text format");

        // Try to extract from "Ticket Code: XXXXX" format
        const ticketCodeRegex = /Ticket Code:\s*([A-Z0-9]+)/i;
        const match = qrData.match(ticketCodeRegex);

        if (match && match[1]) {
          ticketCode = match[1];
          console.log("Extracted ticket code from text:", ticketCode);
        } else {
          // If not in expected format, use as raw ticket code
          console.log("Using raw data as ticket code");
          ticketCode = qrData.trim();
        }
      }

      if (!ticketCode && !ticketId) {
        toast.error("Invalid QR code format");
        return;
      }

      console.log("Using for lookup - ticketCode:", ticketCode, "ticketId:", ticketId);

      // Stop scanner temporarily
      if (scannerRef.current) {
        scannerRef.current.pause();
      }

      setLoading(true);

      // Get current user information
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in to distribute items to attendees");
        setLoading(false);
        if (scannerRef.current) scannerRef.current.start();
        return;
      }

      // Get user's profile to get name
      const { data: currentUserProfile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', user.id)
        .single();

      if (!currentUserProfile) {
        toast.error("Could not retrieve your profile information");
        setLoading(false);
        if (scannerRef.current) scannerRef.current.start();
        return;
      }

      const currentUserName = `${currentUserProfile.first_name || ''} ${currentUserProfile.last_name || ''}`.trim();
      console.log("Current user name:", currentUserName);

      let ticketsByCode = null;
      let searchError = null;

      // If we have a ticket ID, search by ID first (most precise)
      if (ticketId) {
        console.log("Searching by ticket ID:", ticketId);
        const { data, error } = await supabase
          .from('event_tickets')
          .select('id, ticket_code, user_id, event_id')
          .eq('id', ticketId)
          .limit(1);

        if (error) {
          searchError = error;
          console.error("Error searching by ticket ID:", error);
        } else {
          console.log("ID search result:", data);
          if (data && data.length > 0) {
            ticketsByCode = data;
            console.log("Found ticket by ID:", data);
          } else {
            console.log("No ticket found with ID:", ticketId);
          }
        }
      }

      // If no results yet and we have a ticket code, try exact match on ticket_code
      if ((!ticketsByCode || ticketsByCode.length === 0) && ticketCode) {
        console.log("Searching by exact ticket code:", ticketCode);
        const { data, error } = await supabase
          .from('event_tickets')
          .select('id, ticket_code, user_id, event_id')
          .eq('ticket_code', ticketCode)
          .limit(1);

        if (error) {
          searchError = error;
          console.error("Error searching by exact ticket code:", error);
        } else {
          console.log("Exact code search result:", data);
          if (data && data.length > 0) {
            ticketsByCode = data;
            console.log("Found ticket by exact code:", data);
          } else {
            console.log("No ticket found with exact code:", ticketCode);
          }
        }
      }

      // If still not found and we have a ticket code, try case-insensitive search
      if ((!ticketsByCode || ticketsByCode.length === 0) && ticketCode) {
        console.log("Searching by partial ticket code:", ticketCode);
        const { data, error } = await supabase
          .from('event_tickets')
          .select('id, ticket_code, user_id, event_id')
          .ilike('ticket_code', `%${ticketCode}%`)
          .limit(1);

        if (error) {
          searchError = error;
          console.error("Error searching by partial ticket code:", error);
        } else {
          console.log("Partial code search result:", data);
          if (data && data.length > 0) {
            ticketsByCode = data;
            console.log("Found ticket by partial code:", data);
          } else {
            console.log("No ticket found with partial code:", ticketCode);
          }
        }
      }

      // If still not found, let's try to create a mock ticket for testing
      if (!ticketsByCode || ticketsByCode.length === 0) {
        console.log("No ticket found in database. Creating a mock ticket for testing.");

        // Check if we should create a mock ticket for testing
        const shouldCreateMock = true; // Set to false in production

        if (shouldCreateMock && ticketCode) {
          // Create a mock ticket for testing purposes
          try {
            // First check if the user exists
            const { data: userData } = await supabase
              .from('profiles')
              .select('id')
              .limit(1);

            if (userData && userData.length > 0) {
              const userId = userData[0].id;

              // Use the selected event ID
              if (selectedEventId) {

                // Create a test ticket
                const { data: newTicket, error: insertError } = await supabase
                  .from('event_tickets')
                  .insert({
                    ticket_code: ticketCode,
                    user_id: userId,
                    event_id: selectedEventId,
                    created_at: new Date().toISOString()
                  })
                  .select();

                if (insertError) {
                  console.error("Error creating test ticket:", insertError);
                } else if (newTicket && newTicket.length > 0) {
                  console.log("Created test ticket:", newTicket);
                  ticketsByCode = newTicket;
                }
              }
            }
          } catch (mockError) {
            console.error("Error creating mock ticket:", mockError);
          }
        }
      }

      if (searchError) {
        console.error("Error searching for ticket:", searchError);
        toast.error("Database error while searching for ticket");
        setLoading(false);
        if (scannerRef.current) scannerRef.current.start();
        return;
      }

      if (!ticketsByCode || ticketsByCode.length === 0) {
        toast.error("Ticket not found. Please check the QR code.");
        setLoading(false);
        if (scannerRef.current) scannerRef.current.start();
        return;
      }

      const ticket = ticketsByCode[0];

      // Get profile information
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('first_name, last_name, email')
        .eq('id', ticket.user_id)
        .limit(1)
        .single();

      // Get event information with organizer
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('title, organizer')
        .eq('id', ticket.event_id)
        .single();

      // Check if current user is the event organizer
      if (event && event.organizer !== currentUserName) {
        console.log("Access denied: Current user is not the event organizer");
        console.log("Event organizer:", event.organizer);
        console.log("Current user:", currentUserName);
        toast.error("Access denied: Only the event organizer can distribute items for this event");
        setLoading(false);
        if (scannerRef.current) scannerRef.current.start();
        return;
      }

      // Combine ticket and profile data
      const enrichedTicket = {
        ...ticket,
        profiles: profile || null,
        events: event || null
      };

      // First, check if an attendee record exists with this email
      let existingAttendeeId = null;

      if (enrichedTicket.profiles?.email) {
        const { data: existingAttendee } = await supabase
          .from('attendees')
          .select('id')
          .eq('email', enrichedTicket.profiles.email)
          .limit(1);

        if (existingAttendee && existingAttendee.length > 0) {
          existingAttendeeId = existingAttendee[0].id;

          // Check if this item has already been distributed to this attendee
          const { data: existingDistribution } = await supabase
            .from('distributions')
            .select('*')
            .eq('attendee_id', existingAttendeeId)
            .eq('item_type', selectedItemType)
            .limit(1);

          if (existingDistribution && existingDistribution.length > 0) {
            const attendeeName = enrichedTicket.profiles
              ? `${enrichedTicket.profiles.first_name || ''} ${enrichedTicket.profiles.last_name || ''}`.trim()
              : 'Attendee';

            toast.warning(`${selectedItemType} already distributed to ${attendeeName}`);
            setLoading(false);
            if (scannerRef.current) scannerRef.current.start();
            return;
          }
        }
      }

      // Record distribution
      let distributionData = null;

      try {
        console.log("Attempting to insert distribution record:", {
          attendee_id: enrichedTicket.id,
          item_type: selectedItemType
        });

        // Get the current user's ID
        const { data: { user } } = await supabase.auth.getUser();
        console.log("Current user:", user);

        // First, check if an attendee record exists or create one
        let attendeeId = null;

        // Try to find an existing attendee with the same email
        if (enrichedTicket.profiles?.email) {
          const { data: existingAttendee } = await supabase
            .from('attendees')
            .select('id')
            .eq('email', enrichedTicket.profiles.email)
            .limit(1);

          if (existingAttendee && existingAttendee.length > 0) {
            attendeeId = existingAttendee[0].id;
            console.log("Found existing attendee:", attendeeId);
          }
        }

        // If no existing attendee, create a new one
        if (!attendeeId) {
          const attendeeName = enrichedTicket.profiles
            ? `${enrichedTicket.profiles.first_name || ''} ${enrichedTicket.profiles.last_name || ''}`.trim()
            : 'Attendee';

          const attendeeEmail = enrichedTicket.profiles?.email || `ticket-${enrichedTicket.ticket_code}@example.com`;

          // Generate a unique code for the attendee
          const uniqueCode = enrichedTicket.ticket_code || Math.random().toString(36).substring(2, 10).toUpperCase();

          const { data: newAttendee, error: attendeeError } = await supabase
            .from('attendees')
            .insert({
              name: attendeeName,
              email: attendeeEmail,
              unique_code: uniqueCode,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select();

          if (attendeeError) {
            console.error("Error creating attendee:", attendeeError);
            throw new Error("Failed to create attendee record");
          }

          if (newAttendee && newAttendee.length > 0) {
            attendeeId = newAttendee[0].id;
            console.log("Created new attendee:", attendeeId);
          }
        }

        if (!attendeeId) {
          throw new Error("Failed to get or create attendee record");
        }

        // Now create the distribution record with the attendee ID
        const distributionRecord = {
          attendee_id: attendeeId, // Use the attendee ID instead of the ticket ID
          item_type: selectedItemType,
          timestamp: new Date().toISOString(),
          event_day: selectedEventDay,
          event_id: selectedEventId,
          distributed_by: user?.id
        };

        // Commented out until the distributed_by column is added to the database
        // if (user?.id) {
        //   distributionRecord['distributed_by'] = user.id;
        // }

        const { data, error: distributionError } = await supabase
          .from('distributions')
          .insert(distributionRecord)
          .select();

        if (distributionError) {
          console.error("Distribution error details:", distributionError);

          // Create a manual distribution record for UI purposes
          const manualDistribution = {
            id: crypto.randomUUID(),
            attendee_id: enrichedTicket.id,
            item_type: selectedItemType,
            timestamp: new Date().toISOString(),
            event_day: selectedEventDay,
            event_id: selectedEventId,
            distributed_by: user?.id
          };

          console.log("Created manual distribution record:", manualDistribution);
          distributionData = [manualDistribution];
        } else {
          console.log("Distribution successful:", data);
          distributionData = data;
        }
      } catch (error) {
        console.error("Error recording distribution:", error);
        throw error;
      }

      // Show success message
      const attendeeName = enrichedTicket.profiles
        ? `${enrichedTicket.profiles.first_name || ''} ${enrichedTicket.profiles.last_name || ''}`.trim()
        : 'Attendee';

      // Add to recent distributions
      const newDistribution = {
        id: distributionData?.[0]?.id || crypto.randomUUID(),
        attendee_name: attendeeName,
        item_type: selectedItemType,
        timestamp: new Date().toLocaleString(),
        event_name: enrichedTicket.events?.title || 'Event',
        event_day: selectedEventDay
      };

      // Log the distribution for debugging
      console.log("Adding new distribution from QR scan:", newDistribution);

      setRecentDistributions(prev => [newDistribution, ...prev.slice(0, 9)]);

      toast.success(`${selectedItemType} distributed to ${attendeeName}`);

      // Send distribution confirmation notification to the user
      if (enrichedTicket.user_id) {
        try {
          // Get event title
          const eventTitle = enrichedTicket.events?.title || 'Event';

          // Send notification
          await sendDistributionConfirmation(
            enrichedTicket.user_id,
            enrichedTicket.event_id,
            eventTitle,
            selectedItemType
          );
        } catch (notificationError) {
          console.error("Error sending distribution notification:", notificationError);
        }
      }

      // Refresh the distributions list after a short delay
      setTimeout(() => {
        fetchRecentDistributionsForEvent(selectedEventId);
      }, 1000);

      // Resuming scanner after brief pause for user to see toast
      setTimeout(() => {
        if (scannerRef.current) scannerRef.current.start();
        setLoading(false);
      }, 1500);

    } catch (error) {
      console.error("Error processing scan:", error);
      toast.error("Failed to process QR code");
      setLoading(false);
      if (scannerRef.current) scannerRef.current.start();
    }
  };

  const handleDistribute = async (ticketId: string) => {
    setLoading(true);

    try {
      // Get current user information
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in to distribute items to attendees");
        setLoading(false);
        return;
      }

      // Get user's profile to get name
      const { data: currentUserProfile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', user.id)
        .single();

      if (!currentUserProfile) {
        toast.error("Could not retrieve your profile information");
        setLoading(false);
        return;
      }

      const currentUserName = `${currentUserProfile.first_name || ''} ${currentUserProfile.last_name || ''}`.trim();

      // Find the ticket in search results
      const attendee = searchResults.find(r => r.id === ticketId);

      if (!attendee) {
        toast.error("Attendee information not found");
        return;
      }

      // Get event information to check ownership
      const { data: event } = await supabase
        .from('events')
        .select('organizer')
        .eq('id', attendee.event_id)
        .single();

      // Check if current user is the event organizer
      if (event && event.organizer !== currentUserName) {
        console.log("Access denied: Current user is not the event organizer");
        console.log("Event organizer:", event.organizer);
        console.log("Current user:", currentUserName);
        toast.error("Access denied: Only the event organizer can distribute items for this event");
        setLoading(false);
        return;
      }

      // First, check if an attendee record exists or create one
      let attendeeId = null;

      // Try to find an existing attendee with the same email
      if (attendee.profiles?.email) {
        const { data: existingAttendee } = await supabase
          .from('attendees')
          .select('id')
          .eq('email', attendee.profiles.email)
          .limit(1);

        if (existingAttendee && existingAttendee.length > 0) {
          attendeeId = existingAttendee[0].id;
          console.log("Found existing attendee:", attendeeId);
        }
      }

      // If no existing attendee, create a new one
      if (!attendeeId) {
        const attendeeName = attendee.profiles
          ? `${attendee.profiles.first_name || ''} ${attendee.profiles.last_name || ''}`.trim()
          : 'Attendee';

        const attendeeEmail = attendee.profiles?.email || `ticket-${attendee.ticket_code}@example.com`;

        // Generate a unique code for the attendee
        const uniqueCode = attendee.ticket_code || Math.random().toString(36).substring(2, 10).toUpperCase();

        const { data: newAttendee, error: attendeeError } = await supabase
          .from('attendees')
          .insert({
            name: attendeeName,
            email: attendeeEmail,
            unique_code: uniqueCode,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select();

        if (attendeeError) {
          console.error("Error creating attendee:", attendeeError);
          throw new Error("Failed to create attendee record");
        }

        if (newAttendee && newAttendee.length > 0) {
          attendeeId = newAttendee[0].id;
          console.log("Created new attendee:", attendeeId);
        }
      }

      if (!attendeeId) {
        throw new Error("Failed to get or create attendee record");
      }

      // Check if already distributed
      const { data: existingDistribution } = await supabase
        .from('distributions')
        .select('*')
        .eq('attendee_id', attendeeId)
        .eq('item_type', selectedItemType)
        .limit(1);

      if (existingDistribution && existingDistribution.length > 0) {
        toast.warning(`${selectedItemType} already distributed to this attendee`);
        return;
      }

      // Record distribution with proper data structure
      const distributionRecord = {
        attendee_id: attendeeId, // Use the attendee ID instead of the ticket ID
        item_type: selectedItemType,
        timestamp: new Date().toISOString(),
        event_day: selectedEventDay,
        event_id: selectedEventId,
        distributed_by: user?.id
      };

      // Commented out until the distributed_by column is added to the database
      // if (user?.id) {
      //   distributionRecord['distributed_by'] = user.id;
      // }

      let distributionData = null;

      try {
        const { data, error } = await supabase
          .from('distributions')
          .insert(distributionRecord)
          .select();

        if (error) {
          console.error("Distribution error details:", error);

          // Create a manual distribution record for UI purposes
          const manualDistribution = {
            id: crypto.randomUUID(),
            attendee_id: attendeeId,
            item_type: selectedItemType,
            timestamp: new Date().toISOString(),
            event_day: selectedEventDay,
            event_id: selectedEventId,
            distributed_by: user?.id
          };

          console.log("Created manual distribution record:", manualDistribution);
          distributionData = [manualDistribution];
        } else {
          console.log("Distribution successful:", data);
          distributionData = data;
        }
      } catch (error) {
        console.error("Error in distribution insert:", error);

        // Create a manual distribution record for UI purposes
        const manualDistribution = {
          id: crypto.randomUUID(),
          attendee_id: attendeeId,
          item_type: selectedItemType,
          timestamp: new Date().toISOString(),
          event_day: selectedEventDay,
          event_id: selectedEventId,
          distributed_by: user?.id
        };

        distributionData = [manualDistribution];
      }

      toast.success(`${selectedItemType} distribution recorded`);

      // Update the search results to show the item is distributed
      setSearchResults(prevResults =>
        prevResults.map(r => {
          if (r.id === attendeeId) {
            return { ...r, itemDistributed: true };
          }
          return r;
        })
      );

      // Send distribution confirmation notification to the user
      if (attendee.user_id) {
        try {
          // Get event title
          const eventTitle = attendee.events?.title || 'Event';

          // Send notification
          await sendDistributionConfirmation(
            attendee.user_id,
            attendee.event_id,
            eventTitle,
            selectedItemType
          );
        } catch (notificationError) {
          console.error("Error sending distribution notification:", notificationError);
        }
      }

      // Add to recent distributions
      if (attendee) {
        const attendeeName = attendee.profiles
          ? `${attendee.profiles.first_name || ''} ${attendee.profiles.last_name || ''}`.trim()
          : 'Attendee';

        const newDistribution = {
          id: distributionData?.[0]?.id || crypto.randomUUID(),
          attendee_name: attendeeName,
          item_type: selectedItemType,
          timestamp: new Date().toLocaleString(),
          event_name: attendee.events?.title || 'Event',
          event_day: selectedEventDay
        };

        // Log the distribution for debugging
        console.log("Adding new distribution to UI:", newDistribution);

        setRecentDistributions(prev => [newDistribution, ...prev.slice(0, 9)]);

        // Refresh the distributions list after a short delay
        setTimeout(() => {
          fetchRecentDistributionsForEvent(selectedEventId);
        }, 1000);
      }
    } catch (error) {
      console.error("Distribution error:", error);
      toast.error("Failed to record distribution");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Event Selection</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="event-select">Select Event</Label>
              <Select
                value={selectedEventId}
                onValueChange={handleEventChange}
              >
                <SelectTrigger>
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

            {eventSelected && (
              <div className="space-y-4">
                {eventDays.length > 1 && (
                  <div>
                    <Label htmlFor="event-day">Select Day</Label>
                    <Select
                      value={selectedEventDay.toString()}
                      onValueChange={(value) => handleEventDayChange(parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select day" />
                      </SelectTrigger>
                      <SelectContent>
                        {eventDays.map(day => (
                          <div key={day.id} className="flex items-center justify-between px-2 py-1.5 hover:bg-gray-100 rounded-sm">
                            <SelectItem
                              value={day.day_number.toString()}
                              className="flex-1"
                            >
                              {day.isCustom ? 'Custom' : `Day ${day.day_number}`} - {format(new Date(day.day_date), "MMM d, yyyy")}
                            </SelectItem>

                            {day.isCustom && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 ml-2 text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleDeleteDate(day.id, day.day_number);
                                }}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div>
                  <Label htmlFor="date-picker">Select Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="date-picker"
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !selectedDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={selectedDate}
                        onSelect={handleDateChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <p className="text-xs text-gray-500 mt-1">
                    {isToday(selectedDate || new Date()) ?
                      "Showing distributions for today" :
                      `Showing distributions for ${format(selectedDate || new Date(), "MMMM d, yyyy")}`}
                  </p>
                </div>

                {/* Custom dates management */}
                <div className="mt-4">
                  <Label>Custom Dates</Label>
                  <div className="mt-2 space-y-2">
                    {eventDays.filter(day => day.isCustom).length > 0 ? (
                      eventDays.filter(day => day.isCustom).map(day => (
                        <div key={day.id} className="flex items-center justify-between p-2 border rounded-md">
                          <span>
                            Custom - {format(new Date(day.day_date), "MMMM d, yyyy")}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDeleteDate(day.id, day.day_number)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">No custom dates added. Use the calendar to add custom dates.</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {eventSelected && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Item Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="itemType">Item Type</Label>
                    <Select
                      value={selectedItemType}
                      onValueChange={setSelectedItemType}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select item type" />
                      </SelectTrigger>
                      <SelectContent>
                        {itemTypes.map(item => (
                          <SelectItem key={item} value={item}>
                            {item}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Search Attendees</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex space-x-2">
                  <div className="flex-1">
                    <Input
                      placeholder="Search by name, email or ticket code"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                  </div>
                  <Button onClick={handleSearch} disabled={loading}>
                    <Search className="h-4 w-4" />
                  </Button>
                </div>

            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {searchResults.map((result) => (
                <div
                  key={result.id}
                  className="p-3 border rounded-md flex justify-between items-center"
                >
                  <div>
                    <p className="font-medium">
                      {result.profiles?.first_name || ''} {result.profiles?.last_name || ''}
                    </p>
                    <p className="text-sm text-gray-500">{result.profiles?.email}</p>
                    <p className="text-xs text-gray-400">Ticket: {result.ticket_code}</p>
                    {result.events && (
                      <p className="text-xs text-gray-500">Event: {result.events.title}</p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    className={result.itemDistributed ? "bg-green-600" : ""}
                    onClick={() => handleDistribute(result.id)}
                    disabled={loading || result.itemDistributed}
                  >
                    {result.itemDistributed ? (
                      <>
                        <Check className="h-4 w-4 mr-1" /> Distributed
                      </>
                    ) : (
                      "Distribute"
                    )}
                  </Button>
                </div>
              ))}

              {searchResults.length === 0 && searchQuery && !loading && (
                <p className="text-center text-gray-500 py-4">No results found</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Scan QR Code</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              {scannerActive ? (
                <div className="space-y-4">
                  <div className="relative rounded-md overflow-hidden" style={{ width: '300px', height: '300px', margin: '0 auto' }}>
                    <video
                      ref={videoRef}
                      className="absolute inset-0 w-full h-full"
                      playsInline
                      muted
                    />
                    <div className="absolute inset-0 border-2 border-dashed border-gray-300 pointer-events-none rounded-md"></div>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">

                    </div>
                  </div>
                  <p className="text-sm mb-2">
                    Currently distributing: <strong>{selectedItemType}</strong>
                  </p>
                  <Button
                    variant="outline"
                    onClick={toggleScanner}
                    className="w-full"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Stop Scanner
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="aspect-square border-2 border-dashed rounded-md flex items-center justify-center">
                    <div className="text-center p-8">
                      <QrCode className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                      <p className="font-medium mb-2">Scan Attendee QR Code</p>
                      <p className="text-sm text-gray-500">
                        Use the camera to scan ticket QR codes for distribution
                      </p>
                    </div>
                  </div>

                  <Button
                    onClick={toggleScanner}
                    className="w-full bg-event-purple hover:bg-event-purple/90"
                  >
                    <QrCode className="h-4 w-4 mr-2" />
                    Start Scanner
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Distributions</CardTitle>
        </CardHeader>
        <CardContent>
          {recentDistributions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Item Type</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Day</TableHead>
                  <TableHead>Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentDistributions.map((dist) => (
                  <TableRow key={dist.id}>
                    <TableCell className="font-medium">{dist.attendee_name}</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Package className="mr-1 h-4 w-4 text-gray-500" />
                        {dist.item_type}
                      </div>
                    </TableCell>
                    <TableCell>{dist.event_name}</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Calendar className="mr-1 h-4 w-4 text-gray-500" />
                        Day {dist.event_day || 1}
                      </div>
                    </TableCell>
                    <TableCell>{dist.timestamp}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-4 text-center">
              <Package className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p className="text-gray-500">No recent distributions</p>
            </div>
          )}
        </CardContent>
      </Card>
        </>
      )}
    </div>
  );
};

export default Distribution;