import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format, parse } from "date-fns";

interface EventData {
  title: string;
  description: string;
  location: string;
  category: string;
  price: string;
}

const EditEvent = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const [eventData, setEventData] = useState<EventData>({
    title: "",
    description: "",
    location: "",
    category: "",
    price: ""
  });
  const [date, setDate] = useState<string>("");
  const [startTime, setStartTime] = useState<string>("");
  const [endTime, setEndTime] = useState<string>("");
  const [startAmPm, setStartAmPm] = useState<string>("AM");
  const [endAmPm, setEndAmPm] = useState<string>("PM");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [currentImageUrl, setCurrentImageUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    checkAuthorization();
  }, [eventId]);

  const checkAuthorization = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error("You must be logged in to edit events");
        navigate("/login");
        return;
      }
      
      // Get user's profile to match with organizer field
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', session.user.id)
        .single();
      
      if (profileError) {
        console.error("Error fetching profile:", profileError);
        toast.error("Failed to load profile data");
        return;
      }
      
      const fullName = `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim();
      
      // Check if user is the organizer of this event
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();
      
      if (eventError) {
        toast.error("Event not found");
        navigate("/admin");
        return;
      }
      
      if (eventData.organizer !== fullName) {
        toast.error("You are not authorized to edit this event");
        navigate("/admin");
        return;
      }
      
      setIsAuthorized(true);
      
      // Load event data
      setEventData({
        title: eventData.title,
        description: eventData.description || "",
        location: eventData.location,
        category: eventData.category,
        price: eventData.price.startsWith("$") ? eventData.price.substring(1) : eventData.price
      });
      
      setCurrentImageUrl(eventData.image_url);
      
      // Parse date and time
      const eventDate = new Date(eventData.date);
      setDate(format(eventDate, "yyyy-MM-dd"));
      
      // Format time for the input fields
      const hours = eventDate.getHours();
      const minutes = eventDate.getMinutes();
      
      // Convert to 12-hour format
      const displayHours = hours % 12 || 12;
      setStartTime(`${displayHours}:${minutes.toString().padStart(2, '0')}`);
      setStartAmPm(hours >= 12 ? "PM" : "AM");
      
      // Handle end time if available
      if (eventData.end_date) {
        const endDate = new Date(eventData.end_date);
        const endHours = endDate.getHours();
        const endMinutes = endDate.getMinutes();
        
        const displayEndHours = endHours % 12 || 12;
        setEndTime(`${displayEndHours}:${endMinutes.toString().padStart(2, '0')}`);
        setEndAmPm(endHours >= 12 ? "PM" : "AM");
      }
      
    } catch (error) {
      console.error("Error:", error);
      toast.error("An unexpected error occurred");
      navigate("/admin");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEventData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setEventData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const uploadImage = async (file: File): Promise<string> => {
    try {
      // Create a unique file name
      const fileExt = file.name.split('.').pop();
      const fileName = `event-${Date.now()}.${fileExt}`;

      // Upload file
      const { error: uploadError } = await supabase.storage
        .from('events')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data } = supabase.storage
        .from('events')
        .getPublicUrl(fileName);

      return data.publicUrl;
    } catch (error) {
      console.error("Error uploading image:", error);
      throw new Error("Failed to upload image");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSaving(true);

      if (!date) {
        toast.error("Please select a date for your event");
        setSaving(false);
        return;
      }

      if (!startTime) {
        toast.error("Please select a start time for your event");
        setSaving(false);
        return;
      }

      if (!endTime) {
        toast.error("Please select an end time for your event");
        setSaving(false);
        return;
      }

      if (!eventData.category) {
        toast.error("Please select a category for your event");
        setSaving(false);
        return;
      }

      // Upload new image if provided
      let imageUrl = currentImageUrl;
      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
      }

      // Parse and validate time format
      const startTimeMatch = startTime.match(/^(\d{1,2}):(\d{2})$/);
      const endTimeMatch = endTime.match(/^(\d{1,2}):(\d{2})$/);

      if (!startTimeMatch) {
        toast.error("Start time must be in format hh:mm (e.g., 9:30)");
        setSaving(false);
        return;
      }

      if (!endTimeMatch) {
        toast.error("End time must be in format hh:mm (e.g., 5:00)");
        setSaving(false);
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
        setSaving(false);
        return;
      }

      // Update event in database
      const { error: eventError } = await supabase
        .from('events')
        .update({
          title: eventData.title,
          description: eventData.description,
          category: eventData.category,
          location: eventData.location,
          date: eventStartDateTime.toISOString(),
          end_date: eventEndDateTime.toISOString(),
          price: eventData.price ? `$${eventData.price}` : "Free",
          image_url: imageUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', eventId);

      if (eventError) throw eventError;

      toast.success("Event updated successfully!");
      navigate(`/event/${eventId}`);
    } catch (error: any) {
      console.error("Error updating event:", error);
      toast.error(error.message || "Failed to update event");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container px-4 py-12 mx-auto">
        <div className="max-w-3xl mx-auto">
          <div className="text-center py-12">
            <p className="text-gray-500">Loading event data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null; // Will redirect in the checkAuthorization function
  }

  return (
    <div className="container px-4 py-12 mx-auto">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Edit Event</h1>
        <p className="text-gray-500 mb-8">Update your event details</p>
        
        <div className="bg-white rounded-lg shadow-sm p-6 border">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Form fields will be similar to CreateEvent.tsx */}
            {/* Title */}
            <div>
              <Label htmlFor="title">Event Title</Label>
              <Input
                id="title"
                name="title"
                value={eventData.title}
                onChange={handleChange}
                placeholder="Enter event title"
                required
              />
            </div>
            
            {/* Description */}
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={eventData.description}
                onChange={handleChange}
                placeholder="Describe your event"
                className="min-h-32"
              />
            </div>
            
            {/* Category */}
            <div>
              <Label htmlFor="category">Category</Label>
              <Select
                value={eventData.category}
                onValueChange={(value) => handleSelectChange("category", value)}
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Technology">Technology</SelectItem>
                  <SelectItem value="Business">Business</SelectItem>
                  <SelectItem value="Music">Music</SelectItem>
                  <SelectItem value="Arts">Arts</SelectItem>
                  <SelectItem value="Sports">Sports</SelectItem>
                  <SelectItem value="Food">Food & Drink</SelectItem>
                  <SelectItem value="Health">Health & Wellness</SelectItem>
                  <SelectItem value="Education">Education</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Date and Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="startTime">Start Time</Label>
                  <div className="flex">
                    <Input
                      id="startTime"
                      type="text"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      placeholder="e.g., 9:00"
                      className="rounded-r-none"
                      required
                    />
                    <Select
                      value={startAmPm}
                      onValueChange={setStartAmPm}
                    >
                      <SelectTrigger className="w-20 rounded-l-none">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AM">AM</SelectItem>
                        <SelectItem value="PM">PM</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="endTime">End Time</Label>
                  <div className="flex">
                    <Input
                      id="endTime"
                      type="text"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      placeholder="e.g., 5:00"
                      className="rounded-r-none"
                      required
                    />
                    <Select
                      value={endAmPm}
                      onValueChange={setEndAmPm}
                    >
                      <SelectTrigger className="w-20 rounded-l-none">
                        <SelectValue />
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
            
            {/* Location */}
            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                name="location"
                value={eventData.location}
                onChange={handleChange}
                placeholder="Enter event location"
                required
              />
            </div>
            
            {/* Price */}
            <div>
              <Label htmlFor="price">Price (leave empty for free events)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2">$</span>
                <Input
                  id="price"
                  name="price"
                  value={eventData.price}
                  onChange={handleChange}
                  placeholder="0.00"
                  className="pl-8"
                />
              </div>
            </div>
            
            {/* Image Upload */}
            <div>
              <Label htmlFor="image">Event Image</Label>
              <div className="mt-1 flex flex-col space-y-2">
                {currentImageUrl && !previewUrl && (
                  <div className="mb-2">
                    <p className="text-sm text-gray-500 mb-1">Current Image:</p>
                    <img 
                      src={currentImageUrl} 
                      alt="Current event" 
                      className="h-40 w-auto object-cover rounded-md" 
                    />
                  </div>
                )}
                
                {previewUrl && (
                  <div className="mb-2">
                    <p className="text-sm text-gray-500 mb-1">New Image Preview:</p>
                    <img 
                      src={previewUrl} 
                      alt="Preview" 
                      className="h-40 w-auto object-cover rounded-md" 
                    />
                  </div>
                )}
                
                <Input
                  id="image"
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageChange}
                  accept="image/*"
                />
                <p className="text-xs text-gray-500">
                  Upload a new image only if you want to change the current one.
                </p>
              </div>
            </div>
            
            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(`/event/${eventId}`)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-event-purple hover:bg-event-purple/90"
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditEvent;
