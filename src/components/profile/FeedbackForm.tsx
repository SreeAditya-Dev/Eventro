import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Star } from "lucide-react";

interface FeedbackFormProps {
  eventId: string;
  userId: string;
  onFeedbackSubmitted: () => void;
  existingFeedback?: {
    id: string;
    rating: number;
    comment: string | null;
  };
}

export const FeedbackForm = ({
  eventId,
  userId,
  onFeedbackSubmitted,
  existingFeedback
}: FeedbackFormProps) => {
  const [rating, setRating] = useState<number>(existingFeedback?.rating || 0);
  const [comment, setComment] = useState<string>(existingFeedback?.comment || "");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (rating === 0) {
      toast.error("Please select a rating");
      return;
    }

    setLoading(true);

    try {
      if (existingFeedback) {
        // Update existing feedback
        const { error } = await supabase
          .from('feedback')
          .update({
            rating,
            comment: comment.trim() || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingFeedback.id);

        if (error) throw error;

        toast.success("Feedback updated successfully!");
      } else {
        // Create new feedback
        const { error } = await supabase
          .from('feedback')
          .insert({
            event_id: eventId,
            user_id: userId,
            rating,
            comment: comment.trim() || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (error) throw error;

        toast.success("Thank you for your feedback!");
      }

      // Create notification for event organizer
      await createNotification(eventId, userId);

      // Call the callback function to refresh the parent component
      onFeedbackSubmitted();

      // Reset form if it's a new submission
      if (!existingFeedback) {
        setRating(0);
        setComment("");
      }
    } catch (error: any) {
      console.error("Error submitting feedback:", error);
      toast.error(error.message || "Failed to submit feedback");
    } finally {
      setLoading(false);
    }
  };

  const createNotification = async (eventId: string, userId: string) => {
    try {
      // First check if the notifications table exists
      const { error: tableCheckError } = await supabase
        .from('notifications')
        .select('id')
        .limit(1);

      if (tableCheckError) {
        console.error("Notifications table may not exist yet:", tableCheckError);
        return; // Skip notification creation if table doesn't exist
      }

      // Get event details to include in notification
      const { data: eventData } = await supabase
        .from('events')
        .select('title, organizer')
        .eq('id', eventId)
        .single();

      if (!eventData) return;

      // Get organizer's user ID
      const { data: organizerData } = await supabase
        .from('profiles')
        .select('id')
        .ilike('first_name || \' \' || last_name', eventData.organizer)
        .single();

      if (!organizerData) return;

      // Get user's name
      const { data: userData } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', userId)
        .single();

      if (!userData) return;

      const userName = `${userData.first_name || ''} ${userData.last_name || ''}`.trim();

      // Create notification for organizer
      const { error: insertError } = await supabase
        .from('notifications')
        .insert({
          user_id: organizerData.id,
          event_id: eventId,
          type: 'feedback',
          message: `${userName} has submitted feedback for your event "${eventData.title}".`,
          created_at: new Date().toISOString()
        });

      if (insertError) {
        console.error("Error inserting notification:", insertError);
      }
    } catch (error) {
      console.error("Error creating notification:", error);
      // Don't let notification errors affect the feedback submission
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="rating" className="block mb-2">Rating</Label>
        <div className="flex space-x-1">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setRating(value)}
              className="focus:outline-none"
            >
              <Star
                className={`h-8 w-8 ${
                  value <= rating
                    ? "text-yellow-400 fill-yellow-400"
                    : "text-gray-300"
                }`}
              />
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label htmlFor="comment" className="block mb-2">Comment (Optional)</Label>
        <Textarea
          id="comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Share your thoughts about this event..."
          rows={4}
        />
      </div>

      <Button
        type="submit"
        className="w-full bg-event-purple hover:bg-event-purple/90"
        disabled={loading}
      >
        {loading ? "Submitting..." : existingFeedback ? "Update Feedback" : "Submit Feedback"}
      </Button>
    </form>
  );
};
