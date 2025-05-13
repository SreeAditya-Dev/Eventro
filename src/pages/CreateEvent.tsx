
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Clock, Plus, Image, MapPin, Trash } from "lucide-react";
import { format, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";

const categories = [
  "Music",
  "Technology",
  "Business",
  "Food & Drink",
  "Sports",
  "Health",
  "Arts",
  "Community",
  "Education",
  "Other"
];

const CreateEvent = () => {
  const navigate = useNavigate();
  const [date, setDate] = useState<Date>();
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [startAmPm, setStartAmPm] = useState("AM");
  const [endAmPm, setEndAmPm] = useState("PM");
  const [loading, setLoading] = useState(false);
  const [isMultiDay, setIsMultiDay] = useState(false);
  const [eventDays, setEventDays] = useState<{
    date: Date | undefined;
    dayNumber: number;
  }[]>([{ date: undefined, dayNumber: 1 }]);
  const [eventData, setEventData] = useState({
    title: "",
    description: "",
    category: "",
    location: "",
    price: "",
    maxAttendees: "",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEventData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setEventData(prev => ({ ...prev, [name]: value }));
  };

  const handleStartTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStartTime(e.target.value);
  };

  const handleEndTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEndTime(e.target.value);
  };

  const handleStartAmPmChange = (value: string) => {
    setStartAmPm(value);
  };

  const handleEndAmPmChange = (value: string) => {
    setEndAmPm(value);
  };

  const handleMultiDayToggle = (checked: boolean) => {
    setIsMultiDay(checked);
    if (checked) {
      // If toggling on, initialize with the first day (already set) and add a second day
      if (date) {
        setEventDays([
          { date, dayNumber: 1 },
          { date: addDays(date, 1), dayNumber: 2 }
        ]);
      }
    } else {
      // If toggling off, reset to just the first day
      setEventDays([{ date, dayNumber: 1 }]);
    }
  };

  const handleAddEventDay = () => {
    setEventDays(prev => {
      const lastDay = prev[prev.length - 1];
      const newDayNumber = lastDay.dayNumber + 1;
      const newDate = lastDay.date ? addDays(lastDay.date, 1) : undefined;
      return [...prev, { date: newDate, dayNumber: newDayNumber }];
    });
  };

  const handleRemoveEventDay = (dayNumber: number) => {
    if (eventDays.length <= 1) return; // Don't remove the last day

    setEventDays(prev => {
      const filtered = prev.filter(day => day.dayNumber !== dayNumber);
      // Renumber the days to ensure they're sequential
      return filtered.map((day, index) => ({
        ...day,
        dayNumber: index + 1
      }));
    });
  };

  const handleEventDayDateChange = (date: Date | undefined, dayNumber: number) => {
    setEventDays(prev =>
      prev.map(day =>
        day.dayNumber === dayNumber ? { ...day, date } : day
      )
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);

      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];

      // Check if file is an image
      if (!file.type.match('image.*')) {
        toast.error("Please upload an image file");
        return;
      }

      setImageFile(file);

      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const uploadImage = async (file: File): Promise<string> => {
    try {
      // Check if events bucket exists, if not create it
      try {
        const { data, error: bucketError } = await supabase.storage.getBucket('events');
        if (bucketError && bucketError.message.includes('not found')) {
          await supabase.storage.createBucket('events', {
            public: true,
            fileSizeLimit: 5 * 1024 * 1024 // 5MB
          });
        }
      } catch (err) {
        console.log("Bucket already exists or error:", err);
      }

      // Create a unique file name
      const fileExt = file.name.split('.').pop();
      const fileName = `event-${Date.now()}.${fileExt}`;

      // Upload file
      const { error: uploadError } = await supabase.storage
        .from('events')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('events')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error("Error uploading image:", error);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);

      if (!date) {
        toast.error("Please select a date for your event");
        setLoading(false);
        return;
      }

      if (!startTime) {
        toast.error("Please select a start time for your event");
        setLoading(false);
        return;
      }

      if (!endTime) {
        toast.error("Please select an end time for your event");
        setLoading(false);
        return;
      }

      if (!eventData.category) {
        toast.error("Please select a category for your event");
        setLoading(false);
        return;
      }

      if (!imageFile) {
        toast.error("Please upload an image for your event");
        setLoading(false);
        return;
      }

      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        toast.error("You must be logged in to create an event");
        navigate("/login");
        return;
      }

      // Upload image
      const imageUrl = await uploadImage(imageFile);

      // Parse and validate time format
      const startTimeMatch = startTime.match(/^(\d{1,2}):(\d{2})$/);
      const endTimeMatch = endTime.match(/^(\d{1,2}):(\d{2})$/);

      if (!startTimeMatch) {
        toast.error("Start time must be in format hh:mm (e.g., 9:30)");
        setLoading(false);
        return;
      }

      if (!endTimeMatch) {
        toast.error("End time must be in format hh:mm (e.g., 5:00)");
        setLoading(false);
        return;
      }

      // Convert 12-hour format to 24-hour format for start time
      let startHours = parseInt(startTimeMatch[1], 10);
      const startMinutes = parseInt(startTimeMatch[2], 10);

      if (startHours === 12) {
        startHours = startAmPm === "AM" ? 0 : 12;
      } else if (startAmPm === "PM") {
        startHours += 12;
      }

      // Convert 12-hour format to 24-hour format for end time
      let endHours = parseInt(endTimeMatch[1], 10);
      const endMinutes = parseInt(endTimeMatch[2], 10);

      if (endHours === 12) {
        endHours = endAmPm === "AM" ? 0 : 12;
      } else if (endAmPm === "PM") {
        endHours += 12;
      }

      // Create date objects with the converted times
      const eventStartDateTime = new Date(date);
      eventStartDateTime.setHours(startHours);
      eventStartDateTime.setMinutes(startMinutes);

      const eventEndDateTime = new Date(date);
      eventEndDateTime.setHours(endHours);
      eventEndDateTime.setMinutes(endMinutes);

      // Validate that end time is after start time
      if (eventEndDateTime <= eventStartDateTime) {
        toast.error("End time must be after start time");
        setLoading(false);
        return;
      }

      // Get user profile for organizer name
      const { data: profileData } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', session.session.user.id)
        .single();

      const organizerName = profileData
        ? `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim()
        : 'Event Organizer';

      // Create event in database
      const eventId = `event-${Date.now()}`;
      const { data: eventResponse, error: eventError } = await supabase
        .from('events')
        .insert({
          id: eventId,
          title: eventData.title,
          description: eventData.description,
          category: eventData.category,
          location: eventData.location,
          date: eventStartDateTime.toISOString(),
          end_date: eventEndDateTime.toISOString(),
          price: eventData.price ? `$${eventData.price}` : "Free",
          image_url: imageUrl,
          organizer: organizerName,
          attendees: 0,
          tags: []
        })
        .select()
        .single();

      if (eventError) throw eventError;

      // If it's a multi-day event, create event days
      if (isMultiDay && eventDays.length > 1) {
        const eventDaysToInsert = eventDays
          .filter(day => day.date) // Only include days with dates
          .map(day => ({
            event_id: eventId,
            day_number: day.dayNumber,
            day_date: day.date!.toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }));

        if (eventDaysToInsert.length > 0) {
          const { error: daysError } = await supabase
            .from('event_days')
            .insert(eventDaysToInsert);

          if (daysError) {
            console.error("Error creating event days:", daysError);
            // Don't throw, just log the error since the main event was created
          }
        }
      }

      toast.success("Event created successfully!");
      navigate(`/event/${eventResponse.id}`);
    } catch (error: any) {
      console.error("Error creating event:", error);
      toast.error(error.message || "Failed to create event");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container px-4 py-12 mx-auto">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Create an Event</h1>
        <p className="text-gray-500 mb-8">Share your passion with others by hosting an event</p>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Event Title</Label>
              <Input
                id="title"
                name="title"
                placeholder="Give your event a name"
                value={eventData.title}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="multi-day"
                  checked={isMultiDay}
                  onCheckedChange={handleMultiDayToggle}
                />
                <Label htmlFor="multi-day">This is a multi-day event</Label>
              </div>

              {!isMultiDay ? (
                // Single day event UI
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Event Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !date && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {date ? format(date, "MMMM d, yyyy") : <span>Select a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={date}
                          onSelect={(newDate) => {
                            setDate(newDate);
                            // Also update the first day in eventDays
                            if (newDate) {
                              handleEventDayDateChange(newDate, 1);
                            }
                          }}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                          disabled={(date) => date < new Date()}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="time">Event Time</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label htmlFor="startTime" className="text-xs text-muted-foreground mb-1 block">Start Time</Label>
                        <div className="flex gap-2">
                          <Input
                            id="startTime"
                            type="text"
                            placeholder="hh:mm"
                            pattern="^(0?[1-9]|1[0-2]):[0-5][0-9]$"
                            value={startTime}
                            onChange={handleStartTimeChange}
                            className="w-full"
                            required
                          />
                          <Select
                            value={startAmPm}
                            onValueChange={handleStartAmPmChange}
                          >
                            <SelectTrigger className="w-20">
                              <SelectValue placeholder="AM/PM" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="AM">AM</SelectItem>
                              <SelectItem value="PM">PM</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Format: hh:mm (e.g., 9:30)</p>
                      </div>
                      <div>
                        <Label htmlFor="endTime" className="text-xs text-muted-foreground mb-1 block">End Time</Label>
                        <div className="flex gap-2">
                          <Input
                            id="endTime"
                            type="text"
                            placeholder="hh:mm"
                            pattern="^(0?[1-9]|1[0-2]):[0-5][0-9]$"
                            value={endTime}
                            onChange={handleEndTimeChange}
                            className="w-full"
                            required
                          />
                          <Select
                            value={endAmPm}
                            onValueChange={handleEndAmPmChange}
                          >
                            <SelectTrigger className="w-20">
                              <SelectValue placeholder="AM/PM" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="AM">AM</SelectItem>
                              <SelectItem value="PM">PM</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Format: hh:mm (e.g., 5:00)</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                // Multi-day event UI
                <div className="space-y-4 border p-4 rounded-md">
                  <h3 className="font-medium">Event Days</h3>

                  {eventDays.map((day, index) => (
                    <div key={day.dayNumber} className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <Label>Day {day.dayNumber} Date</Label>
                          {index > 0 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveEventDay(day.dayNumber)}
                            >
                              <Trash className="h-4 w-4 text-red-500" />
                            </Button>
                          )}
                        </div>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !day.date && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {day.date ? format(day.date, "MMMM d, yyyy") : <span>Select a date</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={day.date}
                              onSelect={(newDate) => {
                                handleEventDayDateChange(newDate, day.dayNumber);
                                // If this is the first day, also update the main date state
                                if (day.dayNumber === 1 && newDate) {
                                  setDate(newDate);
                                }
                              }}
                              initialFocus
                              className={cn("p-3 pointer-events-auto")}
                              disabled={(date) => date < new Date()}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>

                      {day.dayNumber === 1 && (
                        <div className="space-y-2">
                          <Label htmlFor="time">Event Time</Label>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label htmlFor="startTime" className="text-xs text-muted-foreground mb-1 block">Start Time</Label>
                              <div className="flex gap-2">
                                <Input
                                  id="startTime"
                                  type="text"
                                  placeholder="hh:mm"
                                  pattern="^(0?[1-9]|1[0-2]):[0-5][0-9]$"
                                  value={startTime}
                                  onChange={handleStartTimeChange}
                                  className="w-full"
                                  required
                                />
                                <Select
                                  value={startAmPm}
                                  onValueChange={handleStartAmPmChange}
                                >
                                  <SelectTrigger className="w-20">
                                    <SelectValue placeholder="AM/PM" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="AM">AM</SelectItem>
                                    <SelectItem value="PM">PM</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div>
                              <Label htmlFor="endTime" className="text-xs text-muted-foreground mb-1 block">End Time</Label>
                              <div className="flex gap-2">
                                <Input
                                  id="endTime"
                                  type="text"
                                  placeholder="hh:mm"
                                  pattern="^(0?[1-9]|1[0-2]):[0-5][0-9]$"
                                  value={endTime}
                                  onChange={handleEndTimeChange}
                                  className="w-full"
                                  required
                                />
                                <Select
                                  value={endAmPm}
                                  onValueChange={handleEndAmPmChange}
                                >
                                  <SelectTrigger className="w-20">
                                    <SelectValue placeholder="AM/PM" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="AM">AM</SelectItem>
                                    <SelectItem value="PM">PM</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full mt-2"
                    onClick={handleAddEventDay}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Another Day
                  </Button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={eventData.category}
                  onValueChange={(value) => handleSelectChange("category", value)}
                >
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <div className="relative">
                  <Input
                    id="location"
                    name="location"
                    placeholder="Add a venue or address"
                    value={eventData.location}
                    onChange={handleChange}
                    className="pr-10"
                    required
                  />
                  <MapPin className="absolute right-3 top-2.5 h-5 w-5 text-muted-foreground" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="price">Price</Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                  <Input
                    id="price"
                    name="price"
                    type="text"
                    placeholder="0.00"
                    className="pl-8"
                    value={eventData.price}
                    onChange={handleChange}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Leave blank for free events
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxAttendees">Max Attendees</Label>
                <Input
                  id="maxAttendees"
                  name="maxAttendees"
                  type="number"
                  placeholder="e.g. 100 (optional)"
                  value={eventData.maxAttendees}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Event Description</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Tell people what your event is about"
                className="min-h-[150px]"
                value={eventData.description}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Event Image</Label>
              <div
                className="border-2 border-dashed rounded-lg p-8 text-center"
                onDrop={handleFileDrop}
                onDragOver={handleDragOver}
              >
                {previewUrl ? (
                  <div className="space-y-4">
                    <img
                      src={previewUrl}
                      alt="Event preview"
                      className="max-h-48 mx-auto object-contain"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setImageFile(null);
                        setPreviewUrl(null);
                      }}
                    >
                      Remove Image
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <Image className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm font-medium mb-1">
                      Drag and drop an image, or click to browse
                    </p>
                    <p className="text-xs text-muted-foreground mb-4">
                      Recommended size: 1600 x 900 pixels (16:9)
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Plus className="h-4 w-4 mr-2" /> Upload Image
                    </Button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/*"
                      onChange={handleFileChange}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/browse")}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-event-purple hover:bg-event-purple/90"
                disabled={loading}
              >
                {loading ? "Creating..." : "Create Event"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateEvent;