
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { AlertCircle, Check, Download, Loader2, Upload, Search, Users, FileSpreadsheet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
// We'll use the qrcode library directly
import { saveAs } from "file-saver";
import JSZip from "jszip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Event {
  id: string;
  title: string;
  date: string;
  location: string;
  organizer: string;
}

interface AttendeeRecord {
  name: string;
  email: string;
  company: string | null;
  position: string | null;
  unique_code: string;
  event_id?: string;
}

interface EventAttendee extends AttendeeRecord {
  id: string;
  created_at: string;
}

const generateUniqueCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Function to generate a random password for new users
const generateRandomPassword = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
  let result = '';
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const AttendeeUpload = () => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processedAttendees, setProcessedAttendees] = useState<AttendeeRecord[]>([]);
  const [completed, setCompleted] = useState(false);

  // Event-related state
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [eventAttendees, setEventAttendees] = useState<EventAttendee[]>([]);
  const [originalAttendees, setOriginalAttendees] = useState<EventAttendee[]>([]);
  const [loadingAttendees, setLoadingAttendees] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

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
          .select('id, title, date, location, organizer')
          .eq('organizer', fullName)
          .order('date', { ascending: false });

        if (error) {
          console.error("Error fetching events:", error);
          toast.error("Failed to load events");
          return;
        }

        setEvents(data || []);
      } catch (error) {
        console.error("Error:", error);
        toast.error("An unexpected error occurred");
      }
    };

    fetchEvents();
  }, []);

  // Function to fetch attendees for a specific event
  const fetchEventAttendees = async (eventId: string) => {
    if (!eventId) return;

    setLoadingAttendees(true);
    try {
      // Get tickets for the event
      const { data: ticketData, error: ticketError } = await supabase
        .from('event_tickets')
        .select('id, ticket_code, created_at, user_id, event_id')
        .eq('event_id', eventId);

      if (ticketError) {
        console.error("Error fetching tickets:", ticketError);
        toast.error("Failed to load attendees");
        return;
      }

      console.log(`Found ${ticketData?.length || 0} tickets for event ${eventId}`);

      if (!ticketData || ticketData.length === 0) {
        setEventAttendees([]);
        setOriginalAttendees([]);
        setLoadingAttendees(false);
        return;
      }

      // Get user IDs from tickets
      const userIds = ticketData.map(ticket => ticket.user_id).filter(Boolean);

      if (userIds.length === 0) {
        console.log("No valid user IDs found in tickets");
        setEventAttendees([]);
        setOriginalAttendees([]);
        setLoadingAttendees(false);
        return;
      }

      // Get profiles for these users
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', userIds);

      if (profilesError) {
        console.error("Error fetching profiles:", profilesError);
        toast.error("Failed to load attendee profiles");
        return;
      }

      console.log(`Found ${profilesData?.length || 0} profiles for attendees`);

      // Map tickets to attendees with profile information
      const allAttendees: EventAttendee[] = [];

      ticketData.forEach(ticket => {
        const profile = profilesData?.find(p => p.id === ticket.user_id);

        if (profile) {
          allAttendees.push({
            id: ticket.id,
            name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim(),
            email: profile.email,
            company: null, // The profiles table doesn't have company column
            position: null, // The profiles table doesn't have position column
            unique_code: ticket.ticket_code,
            event_id: eventId,
            created_at: ticket.created_at
          });
        }
      });

      console.log(`Mapped ${allAttendees.length} attendees with profile information`);
      setEventAttendees(allAttendees);
      setOriginalAttendees(allAttendees);
    } catch (error) {
      console.error("Error:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setLoadingAttendees(false);
    }
  };

  // Handle event selection change
  const handleEventChange = (eventId: string) => {
    setSelectedEventId(eventId);
    fetchEventAttendees(eventId);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setCompleted(false);
      setProcessedAttendees([]);
    }
  };

  const processCSV = async (csvText: string, eventId: string) => {
    if (!eventId) {
      throw new Error('Please select an event first');
    }

    const lines = csvText.split('\n');
    const headers = lines[0].split(',').map(header => header.trim());

    const nameIndex = headers.findIndex(h => h.toLowerCase() === 'name');
    const emailIndex = headers.findIndex(h => h.toLowerCase() === 'email');
    const companyIndex = headers.findIndex(h => h.toLowerCase() === 'company');
    const positionIndex = headers.findIndex(h => h.toLowerCase() === 'position');

    if (nameIndex === -1 || emailIndex === -1) {
      throw new Error('CSV must contain at least name and email columns');
    }

    const attendees: AttendeeRecord[] = [];
    const totalLines = lines.length - 1; // Exclude header

    // Get current user for creating tickets
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('You must be logged in to upload attendees');
    }

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;

      const row = lines[i].split(',').map(cell => cell.trim());

      const uniqueCode = generateUniqueCode();
      const attendee: AttendeeRecord = {
        name: row[nameIndex],
        email: row[emailIndex],
        company: companyIndex !== -1 ? row[companyIndex] : null,
        position: positionIndex !== -1 ? row[positionIndex] : null,
        unique_code: uniqueCode
      };

      if (!attendee.name || !attendee.email) continue;

      // First, check if a profile exists for this email
      let userId = null;
      const { data: existingProfiles } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', attendee.email)
        .limit(1);

      if (existingProfiles && existingProfiles.length > 0) {
        userId = existingProfiles[0].id;
      } else {
        // Create a new user first
        const { data: newUser, error: userError } = await supabase.auth.signUp({
          email: attendee.email,
          password: generateRandomPassword(), // Generate a random password
          options: {
            data: {
              first_name: attendee.name.split(' ')[0],
              last_name: attendee.name.split(' ').slice(1).join(' ')
            }
          }
        });

        if (userError) {
          console.error(`Error creating user for ${attendee.email}:`, userError);
          continue;
        }

        if (newUser?.user?.id) {
          userId = newUser.user.id;
        } else {
          console.error(`Failed to create user for ${attendee.email}`);
          continue;
        }
      }

      if (!userId) {
        console.error(`Could not get or create user ID for ${attendee.email}`);
        continue;
      }

      // Create a ticket for this attendee
      try {
        const { error } = await supabase
          .from('event_tickets')
          .insert({
            ticket_code: uniqueCode,
            user_id: userId,
            event_id: eventId,
            created_at: new Date().toISOString()
          });

        if (error) {
          if (error.code === '23505') { // Unique constraint violation
            toast.error(`Duplicate entry: ${attendee.email} already exists`);
          } else {
            toast.error(`Error adding ${attendee.name}: ${error.message}`);
          }
        } else {
          attendees.push(attendee);
        }
      } catch (error) {
        console.error('Error inserting attendee:', error);
      }

      setProgress(Math.round(((i) / totalLines) * 100));
    }

    return attendees;
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select a CSV file first');
      return;
    }

    if (!selectedEventId) {
      toast.error('Please select an event first');
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      const text = await file.text();
      const attendees = await processCSV(text, selectedEventId);
      setProcessedAttendees(attendees);
      setCompleted(true);

      // Refresh the attendee list for the selected event
      fetchEventAttendees(selectedEventId);

      toast.success(`Successfully processed ${attendees.length} attendees for the event`);
    } catch (error) {
      toast.error(`Error processing CSV: ${(error as Error).message}`);
    } finally {
      setUploading(false);
      setProgress(100);
    }
  };

  // Search function for attendees
  const handleSearch = () => {
    if (!selectedEventId) {
      toast.error('Please select an event first');
      return;
    }

    if (!searchQuery.trim()) {
      // Reset to original list
      setEventAttendees(originalAttendees);
      return;
    }

    // Use the original list for filtering
    const filteredAttendees = originalAttendees.filter(attendee =>
      (attendee.name && attendee.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (attendee.email && attendee.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (attendee.company && attendee.company.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (attendee.unique_code && attendee.unique_code.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    setEventAttendees(filteredAttendees);
  };

  // Function to download attendee list as CSV
  const downloadAttendeeList = () => {
    if (!eventAttendees.length) {
      toast.error('No attendees to download');
      return;
    }

    // Create CSV content
    let csvContent = "Name,Email,Company,Position,Code\n";
    eventAttendees.forEach(a => {
      csvContent += `"${a.name || ''}","${a.email || ''}","${a.company || ''}","${a.position || ''}","${a.unique_code || ''}"\n`;
    });

    // Create a blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;

    // Get event name for the filename
    const event = events.find(e => e.id === selectedEventId);
    const eventName = event ? event.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'event';

    link.setAttribute('download', `${eventName}_attendees.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Attendee list downloaded');
  };

  const downloadQRCodes = async () => {
    if (!processedAttendees.length) {
      toast.error('No attendees to generate QR codes for');
      return;
    }

    // Check if we're on HTTPS for QR code generation
    // This is just a warning, not a blocker, since we're not using the camera here
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && !window.location.hostname.includes('127.0.0.1')) {
      console.warn("Note: For security, QR code scanning will only work over HTTPS in production.");
    }

    const zip = new JSZip();
    const qrFolder = zip.folder("qr-codes");

    try {
      // Import QRCode library
      const QRCode = await import('qrcode');

      // Create QR code promises
      const qrPromises = processedAttendees.map((attendee) => {
        return new Promise<void>((resolve) => {
          // Generate QR code as data URL
          QRCode.toDataURL(JSON.stringify({ code: attendee.unique_code, name: attendee.name }), {
            width: 300,
            margin: 4
          }, (error, url) => {
            if (error) {
              console.error("Error generating QR code:", error);
              resolve();
              return;
            }

            // Convert data URL to blob
            fetch(url)
              .then(res => res.blob())
              .then(blob => {
                if (qrFolder) {
                  qrFolder.file(`${attendee.name.replace(/[^a-z0-9]/gi, '_')}-${attendee.unique_code}.png`, blob);
                }
                resolve();
              })
              .catch(err => {
                console.error("Error converting QR code to blob:", err);
                resolve();
              });
          });
        });
      });

      // Also add a CSV of the codes
      let csvContent = "Name,Email,Company,Position,Code\n";
      processedAttendees.forEach(a => {
        csvContent += `"${a.name}","${a.email}","${a.company || ''}","${a.position || ''}","${a.unique_code}"\n`;
      });

      if (qrFolder) {
        qrFolder.file("attendee-codes.csv", csvContent);
      }

      // Wait for all QR codes to be generated
      await Promise.all(qrPromises);

      // Generate and download the ZIP file
      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, "attendee-qr-codes.zip");
      toast.success("Downloaded QR codes and CSV");
    } catch (error) {
      console.error("Error generating QR codes:", error);
      toast.error("Failed to generate QR codes");
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
          </div>
        </CardContent>
      </Card>

      {selectedEventId && (
        <Tabs defaultValue="upload">
          <TabsList className="mb-6">
            <TabsTrigger value="upload">
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Upload Attendees
            </TabsTrigger>
            <TabsTrigger value="view">
              <Users className="h-4 w-4 mr-2" />
              View Attendees
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload">
            <Card>
              <CardHeader>
                <CardTitle>Upload Attendees</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-6 text-gray-600">
                  Upload a CSV file with attendee information. The file should contain at least 'name' and 'email' columns.
                  Optional columns: 'company' and 'position'.
                </p>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="file-upload">CSV File</Label>
                    <Input
                      id="file-upload"
                      type="file"
                      accept=".csv"
                      onChange={handleFileChange}
                      disabled={uploading}
                      className="mt-1"
                    />
                  </div>

                  {uploading && (
                    <div className="space-y-2">
                      <Label>Processing...</Label>
                      <Progress value={progress} className="h-2" />
                      <p className="text-sm text-gray-500">{progress}% Complete</p>
                    </div>
                  )}

                  <div className="flex flex-col md:flex-row gap-4">
                    <Button
                      onClick={handleUpload}
                      disabled={!file || uploading}
                      className="bg-event-purple hover:bg-event-purple/90"
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" />
                          Process Attendees
                        </>
                      )}
                    </Button>

                    {completed && (
                      <Button
                        onClick={downloadQRCodes}
                        disabled={processedAttendees.length === 0}
                        variant="outline"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download QR Codes
                      </Button>
                    )}
                  </div>

                  {completed && (
                    <div className="mt-4">
                      <div className="flex items-center gap-2 text-green-600">
                        <Check className="h-5 w-5" />
                        <span>Upload complete! {processedAttendees.length} attendees processed successfully.</span>
                      </div>

                      {processedAttendees.length > 0 && (
                        <div className="mt-4">
                          <h3 className="font-semibold mb-2">Preview (First 5 Attendees)</h3>
                          <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                              <thead>
                                <tr className="bg-gray-100">
                                  <th className="border p-2 text-left">Name</th>
                                  <th className="border p-2 text-left">Email</th>
                                  <th className="border p-2 text-left">Code</th>
                                </tr>
                              </thead>
                              <tbody>
                                {processedAttendees.slice(0, 5).map((attendee, index) => (
                                  <tr key={index} className={index % 2 === 0 ? "bg-gray-50" : ""}>
                                    <td className="border p-2">{attendee.name}</td>
                                    <td className="border p-2">{attendee.email}</td>
                                    <td className="border p-2">{attendee.unique_code}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="view">
            <Card>
              <CardHeader>
                <CardTitle>View Attendees</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex flex-col md:flex-row gap-4 mb-4">
                    <div className="flex space-x-2 flex-1">
                      <div className="flex-1">
                        <Input
                          placeholder="Search by name, email or code"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        />
                      </div>
                      <Button onClick={handleSearch} disabled={loadingAttendees}>
                        <Search className="h-4 w-4" />
                      </Button>
                    </div>

                    {eventAttendees.length > 0 && (
                      <Button
                        variant="outline"
                        onClick={downloadAttendeeList}
                        className="whitespace-nowrap"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download List
                      </Button>
                    )}
                  </div>

                  {loadingAttendees ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                    </div>
                  ) : eventAttendees.length > 0 ? (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Company</TableHead>
                            <TableHead>Position</TableHead>
                            <TableHead>Code</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {eventAttendees.map((attendee) => (
                            <TableRow key={attendee.id}>
                              <TableCell className="font-medium">{attendee.name}</TableCell>
                              <TableCell>{attendee.email}</TableCell>
                              <TableCell>{attendee.company || '-'}</TableCell>
                              <TableCell>{attendee.position || '-'}</TableCell>
                              <TableCell>{attendee.unique_code}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p className="text-gray-500">No attendees found for this event</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default AttendeeUpload;
