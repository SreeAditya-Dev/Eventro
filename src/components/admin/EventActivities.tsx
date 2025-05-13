
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { format } from "date-fns";
import { CalendarIcon, Plus, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface Activity {
  id: string;
  event_id: string;
  activity_name: string;
  activity_description: string | null;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  required_resources: string | null;
  created_at: string;
  updated_at: string;
}

const EventActivities = ({ eventId }: { eventId: string }) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentActivity, setCurrentActivity] = useState<Activity | null>(null);
  
  // Form states
  const [activityName, setActivityName] = useState("");
  const [activityDescription, setActivityDescription] = useState("");
  const [activityLocation, setActivityLocation] = useState("");
  const [requiredResources, setRequiredResources] = useState("");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();

  useEffect(() => {
    if (eventId) {
      fetchActivities();
    }
  }, [eventId]);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('event_activities')
        .select('*')
        .eq('event_id', eventId)
        .order('start_time', { ascending: true });

      if (error) throw error;
      setActivities(data || []);
    } catch (error: any) {
      toast.error("Error loading activities: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setActivityName("");
    setActivityDescription("");
    setActivityLocation("");
    setRequiredResources("");
    setStartDate(undefined);
    setEndDate(undefined);
    setCurrentActivity(null);
  };

  const openAddDialog = () => {
    resetForm();
    setIsAddDialogOpen(true);
  };

  const openEditDialog = (activity: Activity) => {
    setCurrentActivity(activity);
    setActivityName(activity.activity_name);
    setActivityDescription(activity.activity_description || "");
    setActivityLocation(activity.location || "");
    setRequiredResources(activity.required_resources || "");
    setStartDate(activity.start_time ? new Date(activity.start_time) : undefined);
    setEndDate(activity.end_time ? new Date(activity.end_time) : undefined);
    setIsEditDialogOpen(true);
  };

  const handleAddActivity = async () => {
    try {
      if (!activityName) {
        toast.error("Activity name is required");
        return;
      }

      const { data, error } = await supabase
        .from('event_activities')
        .insert([{
          event_id: eventId,
          activity_name: activityName,
          activity_description: activityDescription || null,
          location: activityLocation || null,
          required_resources: requiredResources || null,
          start_time: startDate?.toISOString() || null,
          end_time: endDate?.toISOString() || null
        }])
        .select();

      if (error) throw error;
      
      toast.success("Activity added successfully");
      setIsAddDialogOpen(false);
      resetForm();
      fetchActivities();
    } catch (error: any) {
      toast.error("Error adding activity: " + error.message);
    }
  };

  const handleUpdateActivity = async () => {
    try {
      if (!currentActivity || !activityName) {
        toast.error("Activity name is required");
        return;
      }

      const { data, error } = await supabase
        .from('event_activities')
        .update({
          activity_name: activityName,
          activity_description: activityDescription || null,
          location: activityLocation || null,
          required_resources: requiredResources || null,
          start_time: startDate?.toISOString() || null,
          end_time: endDate?.toISOString() || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentActivity.id)
        .select();

      if (error) throw error;
      
      toast.success("Activity updated successfully");
      setIsEditDialogOpen(false);
      resetForm();
      fetchActivities();
    } catch (error: any) {
      toast.error("Error updating activity: " + error.message);
    }
  };

  const handleDeleteActivity = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this activity?")) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('event_activities')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success("Activity deleted successfully");
      fetchActivities();
    } catch (error: any) {
      toast.error("Error deleting activity: " + error.message);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Event Activities</CardTitle>
        <Button onClick={openAddDialog} className="bg-event-purple hover:bg-event-purple/90">
          <Plus className="mr-2 h-4 w-4" /> Add Activity
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-event-purple border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
            <p className="mt-2 text-gray-500">Loading activities...</p>
          </div>
        ) : activities.length > 0 ? (
          <div className="space-y-4">
            {activities.map((activity) => (
              <div 
                key={activity.id} 
                className="p-4 border rounded-md hover:bg-gray-50 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium">{activity.activity_name}</h3>
                    {activity.activity_description && (
                      <p className="text-gray-600 mt-1">{activity.activity_description}</p>
                    )}
                    
                    <div className="mt-2 text-sm text-gray-500 space-y-1">
                      {activity.start_time && (
                        <div className="flex items-center">
                          <CalendarIcon className="h-4 w-4 mr-1" />
                          <span>
                            {format(new Date(activity.start_time), "MMM d, yyyy h:mm a")}
                            {activity.end_time && ` - ${format(new Date(activity.end_time), "h:mm a")}`}
                          </span>
                        </div>
                      )}
                      
                      {activity.location && (
                        <div>Location: {activity.location}</div>
                      )}
                      
                      {activity.required_resources && (
                        <div>Resources: {activity.required_resources}</div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => openEditDialog(activity)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="text-red-500 hover:text-red-700" 
                      onClick={() => handleDeleteActivity(activity.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p className="mb-4">No activities added yet</p>
            <Button onClick={openAddDialog} className="bg-event-purple hover:bg-event-purple/90">
              <Plus className="mr-2 h-4 w-4" /> Add First Activity
            </Button>
          </div>
        )}
      </CardContent>

      {/* Add Activity Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Activity</DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="activity-name">Activity Name *</Label>
              <Input 
                id="activity-name" 
                value={activityName}
                onChange={(e) => setActivityName(e.target.value)}
                placeholder="Enter activity name"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="activity-description">Description</Label>
              <Textarea 
                id="activity-description" 
                value={activityDescription}
                onChange={(e) => setActivityDescription(e.target.value)}
                placeholder="Describe the activity"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="activity-location">Location</Label>
              <Input 
                id="activity-location" 
                value={activityLocation}
                onChange={(e) => setActivityLocation(e.target.value)}
                placeholder="Enter location"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="required-resources">Required Resources</Label>
              <Input 
                id="required-resources" 
                value={requiredResources}
                onChange={(e) => setRequiredResources(e.target.value)}
                placeholder="List required resources"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Start Time</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "PPP p") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div className="grid gap-2">
                <Label>End Time</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "PPP p") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddActivity} className="bg-event-purple hover:bg-event-purple/90">
              Save Activity
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Activity Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Activity</DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-activity-name">Activity Name *</Label>
              <Input 
                id="edit-activity-name" 
                value={activityName}
                onChange={(e) => setActivityName(e.target.value)}
                placeholder="Enter activity name"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="edit-activity-description">Description</Label>
              <Textarea 
                id="edit-activity-description" 
                value={activityDescription}
                onChange={(e) => setActivityDescription(e.target.value)}
                placeholder="Describe the activity"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="edit-activity-location">Location</Label>
              <Input 
                id="edit-activity-location" 
                value={activityLocation}
                onChange={(e) => setActivityLocation(e.target.value)}
                placeholder="Enter location"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="edit-required-resources">Required Resources</Label>
              <Input 
                id="edit-required-resources" 
                value={requiredResources}
                onChange={(e) => setRequiredResources(e.target.value)}
                placeholder="List required resources"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Start Time</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "PPP p") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div className="grid gap-2">
                <Label>End Time</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "PPP p") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateActivity} className="bg-event-purple hover:bg-event-purple/90">
              Update Activity
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default EventActivities;
