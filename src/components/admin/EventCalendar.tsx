import { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { format, isToday, isSameDay } from "date-fns";
import { CalendarIcon, Mail, Copy, Check, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { services as geminiService } from "@/services/geminiService";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { openEmailClient } from "@/utils/directEmailService";

interface Event {
  id: string;
  title: string;
  date: string;
  end_date: string | null;
  time?: string;
  location?: string;
  description?: string;
  created_at?: string;
  user_id?: string;
}

interface Reminder {
  id: string;
  event_id: string;
  reminder_title: string;
  reminder_description: string;
  reminder_date: string;
  is_sent: boolean;
}

const EventCalendar = () => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventsForSelectedDate, setEventsForSelectedDate] = useState<Event[]>([]);
  const [remindersForSelectedDate, setRemindersForSelectedDate] = useState<Reminder[]>([]);
  const [isSendEmailDialogOpen, setIsSendEmailDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [emailRecipient, setEmailRecipient] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailContent, setEmailContent] = useState("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isGeneratingEmail, setIsGeneratingEmail] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    fetchEvents();
    fetchReminders();
  }, []);

  useEffect(() => {
    if (selectedDate && events.length > 0) {
      filterEventsForSelectedDate();
    }
  }, [selectedDate, events]);

  useEffect(() => {
    if (selectedDate && reminders.length > 0) {
      filterRemindersForSelectedDate();
    }
  }, [selectedDate, reminders]);

  const fetchEvents = async () => {
    try {
      setLoading(true);

      // Get current user
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        toast.error("You must be logged in to view events");
        return;
      }

      // Get user's profile to match with organizer field
      const { data: profileData } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', session.user.id)
        .single();

      if (!profileData) return;

      const fullName = `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim();

      // Fetch events where the user is the organizer
      const { data, error } = await supabase
        .from('events')
        .select('id, title, date, end_date')
        .eq('organizer', fullName);

      if (error) throw error;
      setEvents(data || []);
    } catch (error: any) {
      toast.error("Error loading events: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchReminders = async () => {
    try {
      setLoading(true);

      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        return;
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', session.user.id)
        .single();

      if (!profileData) return;

      const fullName = `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim();

      // Get event IDs first
      const { data: eventsData } = await supabase
        .from('events')
        .select('id')
        .eq('organizer', fullName);

      if (!eventsData || eventsData.length === 0) {
        setReminders([]);
        return;
      }

      const eventIds = eventsData.map(e => e.id);

      // Get reminders for these events
      const { data, error } = await supabase
        .from('event_reminders')
        .select('*')
        .in('event_id', eventIds);

      if (error) throw error;
      setReminders(data || []);
    } catch (error: any) {
      console.error("Error loading reminders:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterEventsForSelectedDate = () => {
    if (!selectedDate) return;

    const filtered = events.filter(event => {
      const eventDate = new Date(event.date);
      const eventEndDate = event.end_date ? new Date(event.end_date) : null;

      // Check if selected date is the event date or between start and end dates
      if (isSameDay(eventDate, selectedDate)) {
        return true;
      } else if (eventEndDate && selectedDate >= eventDate && selectedDate <= eventEndDate) {
        return true;
      }
      return false;
    });

    setEventsForSelectedDate(filtered);
  };

  const filterRemindersForSelectedDate = () => {
    if (!selectedDate) return;

    const filtered = reminders.filter(reminder => {
      const reminderDate = new Date(reminder.reminder_date);
      return isSameDay(reminderDate, selectedDate);
    });

    setRemindersForSelectedDate(filtered);
  };

  const openSendEmailDialog = (event: Event) => {
    setSelectedEvent(event);
    setEmailSubject(`Updates about: ${event.title}`);
    setIsSendEmailDialogOpen(true);
  };

  const generateEmailWithAI = async () => {
    if (!selectedEvent) return;

    try {
      setIsGeneratingEmail(true);

      // Format the date for better readability
      const formattedDate = format(new Date(selectedEvent.date), "EEEE, MMMM d, yyyy");

      // Check if the event is today
      const isTodayEvent = isToday(new Date(selectedEvent.date));

      // Prepare event details for the AI
      const eventDetails = {
        title: selectedEvent.title,
        date: formattedDate,
        time: selectedEvent.time || '',
        location: selectedEvent.location || '',
        description: selectedEvent.description || '',
        isTodayEvent: isTodayEvent
      };

      console.log("Sending event details to generate-email function:", eventDetails);

      const response = await geminiService.generateEventReminderEmail(eventDetails);

      if (response && response.subject && response.content) {
        setEmailSubject(response.subject);
        setEmailContent(response.content);
        toast.success("Email content generated successfully");
      } else {
        console.error("Invalid response from generate-email:", response);
        toast.warning("Could not generate email content, using fallback template");

        // Use a fallback template with improved styling
        setEmailSubject(`Reminder: ${selectedEvent.title} - ${formattedDate}`);
        setEmailContent(`
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
            <h2 style="color: #5c4e8e;">${selectedEvent.title} - Event Reminder</h2>

            <p>Dear Attendee,</p>

            <p>This is a friendly reminder about the upcoming event:</p>

            <div style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid #5c4e8e; margin: 20px 0;">
              <p><strong>Date:</strong> ${formattedDate}</p>
              ${selectedEvent.time ? `<p><strong>Time:</strong> ${selectedEvent.time}</p>` : ''}
              ${selectedEvent.location ? `<p><strong>Location:</strong> ${selectedEvent.location}</p>` : ''}
            </div>

            <p>We're looking forward to seeing you there!</p>

            <p>Best regards,<br>The Event Team</p>

            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #777;">
              <p>If you have any questions, please don't hesitate to contact us.</p>
            </div>
          </div>
        `);
      }
    } catch (error: any) {
      console.error("Error generating email:", error.message || error);
      toast.error(`Error generating email: ${error.message || "Unknown error"}`);

      // Use a fallback template with improved styling
      const formattedDate = format(new Date(selectedEvent.date), "EEEE, MMMM d, yyyy");

      setEmailSubject(`Reminder: ${selectedEvent.title} - ${formattedDate}`);
      setEmailContent(`
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
          <h2 style="color: #5c4e8e;">${selectedEvent.title} - Event Reminder</h2>

          <p>Dear Attendee,</p>

          <p>This is a friendly reminder about the upcoming event:</p>

          <div style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid #5c4e8e; margin: 20px 0;">
            <p><strong>Date:</strong> ${formattedDate}</p>
            ${selectedEvent.time ? `<p><strong>Time:</strong> ${selectedEvent.time}</p>` : ''}
            ${selectedEvent.location ? `<p><strong>Location:</strong> ${selectedEvent.location}</p>` : ''}
          </div>

          <p>We're looking forward to seeing you there!</p>

          <p>Best regards,<br>The Event Team</p>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #777;">
            <p>If you have any questions, please don't hesitate to contact us.</p>
          </div>
        </div>
      `);
    } finally {
      setIsGeneratingEmail(false);
    }
  };

  // Function to copy email content to clipboard
  const copyEmailContent = async () => {
    try {
      // Create a string with both subject and content
      const fullContent = `Subject: ${emailSubject}\n\n${emailContent.replace(/<[^>]*>/g, '')}`;

      // Copy to clipboard
      await navigator.clipboard.writeText(fullContent);

      // Show success state
      setIsCopied(true);
      toast.success("Email content copied to clipboard");

      // Reset copy state after 2 seconds
      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
      toast.error("Failed to copy to clipboard");
    }
  };

  // Function to handle opening the email client
  const handleOpenEmailClient = () => {
    if (!emailRecipient || !emailSubject || !emailContent) return;

    openEmailClient(emailRecipient, emailSubject, emailContent);
  };

  const sendEmail = async () => {
    if (!selectedEvent || !emailRecipient || !emailSubject || !emailContent) {
      toast.error("Please fill all email fields");
      return;
    }

    try {
      setIsSendingEmail(true);

      // Extract event details from the selected event
      const eventDate = selectedEvent.date ? format(new Date(selectedEvent.date), 'EEEE, MMMM d, yyyy') : '';
      const eventTime = selectedEvent.time || '';
      const eventLocation = selectedEvent.location || '';

      // Prepare data for the Edge Function
      const reminderData = {
        recipientEmail: emailRecipient,
        recipientName: '', // You could add a name field to the form if needed
        eventTitle: selectedEvent.title,
        eventDate: eventDate,
        eventTime: eventTime,
        eventLocation: eventLocation,
        eventDescription: selectedEvent.description || '',
        organizerName: 'Event Team'
      };

      console.log("Sending reminder email with data:", reminderData);

      // Call the Edge Function to send the reminder email
      try {
        const { data, error } = await supabase.functions.invoke('send-reminder-email', {
          body: reminderData
        });

        if (error) {
          console.error("Error from send-reminder-email function:", error);
          throw error;
        }

        console.log("Reminder email sent successfully:", data);

        toast.success("Reminder email sent successfully");
        setIsSendEmailDialogOpen(false);

        // Reset form
        setEmailRecipient("");
        setEmailSubject("");
        setEmailContent("");
        setSelectedEvent(null);
        return;
      } catch (edgeFunctionError) {
        console.error("Edge Function failed:", edgeFunctionError);
        throw new Error("Failed to send reminder email. Please try again later.");
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("Error sending email:", errorMessage);
      toast.error(`Error sending email: ${errorMessage}`);

      // Show fallback options
      toast.info("You can copy the email content to your clipboard.", {
        duration: 5000,
        action: {
          label: "Copy Content",
          onClick: copyEmailContent
        }
      });

      toast.info("Or open your default email client with the content pre-filled.", {
        duration: 5000,
        action: {
          label: "Open Email Client",
          onClick: handleOpenEmailClient
        }
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Event Calendar</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-event-purple border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
            <p className="mt-2 text-gray-500">Loading calendar...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md border shadow"
                modifiers={{
                  eventDay: events.map(event => {
                    const eventDate = new Date(event.date);
                    return eventDate;
                  }),
                  reminderDay: reminders.map(reminder => {
                    const reminderDate = new Date(reminder.reminder_date);
                    return reminderDate;
                  }),
                  today: new Date(),
                }}
                modifiersStyles={{
                  eventDay: { border: "2px solid #8b5cf6" },
                  reminderDay: { backgroundColor: "#ede9fe" },
                  today: { fontWeight: "bold", border: "2px solid #ef4444" },
                }}
              />
              <div className="mt-4 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full border-2 border-[#8b5cf6]"></div>
                  <span className="text-sm text-gray-500">Event Date</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-[#ede9fe]"></div>
                  <span className="text-sm text-gray-500">Reminder Set</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full border-2 border-[#ef4444]"></div>
                  <span className="text-sm text-gray-500">Today</span>
                </div>
              </div>
            </div>

            <div className="md:col-span-2">
              <h3 className="font-medium text-lg mb-4">
                {selectedDate ? format(selectedDate, "MMMM d, yyyy") : "Select a date"}
              </h3>

              {/* Events for selected date */}
              {eventsForSelectedDate.length > 0 ? (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-500 mb-2">EVENTS</h4>
                  <div className="space-y-3">
                    {eventsForSelectedDate.map((event) => (
                      <div key={event.id} className="p-3 border rounded-md hover:bg-gray-50">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium">{event.title}</div>
                            <div className="text-sm text-gray-500 flex items-center mt-1">
                              <CalendarIcon className="h-3.5 w-3.5 mr-1" />
                              {format(new Date(event.date), "h:mm a")}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex items-center gap-1"
                            onClick={() => openSendEmailDialog(event)}
                          >
                            <Mail className="h-3.5 w-3.5" />
                            <span>Send Reminder</span>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center text-gray-500 mb-6 border rounded-md">
                  <p>No events scheduled for this date</p>
                </div>
              )}

              {/* Reminders for selected date */}
              {remindersForSelectedDate.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">REMINDERS</h4>
                  <div className="space-y-3">
                    {remindersForSelectedDate.map((reminder) => (
                      <div key={reminder.id} className="p-3 border rounded-md bg-purple-50">
                        <div className="font-medium">{reminder.reminder_title}</div>
                        <div className="text-sm text-gray-600 mt-1">
                          {reminder.reminder_description}
                        </div>
                        <div className="flex items-center mt-2 text-xs text-gray-500">
                          <div className={cn(
                            "w-2 h-2 rounded-full mr-1",
                            reminder.is_sent ? "bg-green-500" : "bg-yellow-500"
                          )}></div>
                          {reminder.is_sent ? "Sent" : "Not sent"}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>

      {/* Send Email Dialog */}
      <Dialog
        open={isSendEmailDialogOpen}
        onOpenChange={(open) => {
          setIsSendEmailDialogOpen(open);
          if (!open) {
            // Reset copy state when dialog is closed
            setIsCopied(false);
          }
        }}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Send Event Reminder Email</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="email-recipient">Recipient Email</label>
              <Input
                id="email-recipient"
                type="email"
                value={emailRecipient}
                onChange={(e) => setEmailRecipient(e.target.value)}
                placeholder="Enter recipient email address"
              />
            </div>

            <div className="grid gap-2">
              <label htmlFor="email-subject">Email Subject</label>
              <Input
                id="email-subject"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <label htmlFor="email-content">Email Content</label>
              <div className="flex justify-end gap-2 mb-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyEmailContent}
                  disabled={!emailContent}
                  className="flex items-center gap-1"
                >
                  {isCopied ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      Copy
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenEmailClient}
                  disabled={!emailContent || !emailRecipient}
                  className="flex items-center gap-1"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open Email Client
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={generateEmailWithAI}
                  disabled={isGeneratingEmail}
                >
                  {isGeneratingEmail ? (
                    <>
                      <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-solid border-current border-r-transparent align-[-0.125em] mr-1"></span>
                      Generating...
                    </>
                  ) : (
                    "Generate with AI"
                  )}
                </Button>
              </div>
              <Textarea
                id="email-content"
                value={emailContent}
                onChange={(e) => setEmailContent(e.target.value)}
                placeholder="Write your email content here..."
                className="h-48"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSendEmailDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={sendEmail}
              disabled={isSendingEmail || !emailRecipient || !emailSubject || !emailContent}
              className="bg-event-purple hover:bg-event-purple/90"
            >
              {isSendingEmail ? (
                <>
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent align-[-0.125em] mr-2"></span>
                  Sending...
                </>
              ) : (
                "Send Email"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default EventCalendar;
