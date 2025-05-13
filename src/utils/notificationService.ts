import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export enum NotificationType {
  REGISTRATION = 'registration',
  CHECK_IN = 'check_in',
  DISTRIBUTION = 'distribution',
  FEEDBACK = 'feedback'
}

/**
 * Send a notification to a user
 * @param userId The user ID to send the notification to
 * @param eventId The event ID the notification is related to
 * @param type The type of notification
 * @param message The notification message
 * @returns Promise<boolean> True if the notification was sent successfully
 */
export const sendNotification = async (
  userId: string,
  eventId: string,
  type: NotificationType,
  message: string
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        event_id: eventId,
        type,
        message,
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error("Error sending notification:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error in sendNotification:", error);
    return false;
  }
};

/**
 * Send a registration confirmation notification
 * @param userId The user ID to send the notification to
 * @param eventId The event ID the notification is related to
 * @param eventTitle The title of the event
 * @returns Promise<boolean> True if the notification was sent successfully
 */
export const sendRegistrationConfirmation = async (
  userId: string,
  eventId: string,
  eventTitle: string
): Promise<boolean> => {
  const message = `Thank you for registering for "${eventTitle}". Your ticket has been confirmed.`;
  return sendNotification(userId, eventId, NotificationType.REGISTRATION, message);
};

/**
 * Send a check-in confirmation notification
 * @param userId The user ID to send the notification to
 * @param eventId The event ID the notification is related to
 * @param eventTitle The title of the event
 * @param eventDay The day of the event (for multi-day events)
 * @returns Promise<boolean> True if the notification was sent successfully
 */
export const sendCheckInConfirmation = async (
  userId: string,
  eventId: string,
  eventTitle: string,
  eventDay: number = 1
): Promise<boolean> => {
  const message = `You have been checked in for "${eventTitle}" (Day ${eventDay}).`;
  return sendNotification(userId, eventId, NotificationType.CHECK_IN, message);
};

/**
 * Send a distribution confirmation notification
 * @param userId The user ID to send the notification to
 * @param eventId The event ID the notification is related to
 * @param eventTitle The title of the event
 * @param itemType The type of item distributed
 * @returns Promise<boolean> True if the notification was sent successfully
 */
export const sendDistributionConfirmation = async (
  userId: string,
  eventId: string,
  eventTitle: string,
  itemType: string
): Promise<boolean> => {
  const message = `You have received a ${itemType} for "${eventTitle}".`;
  return sendNotification(userId, eventId, NotificationType.DISTRIBUTION, message);
};

/**
 * Get unread notifications for a user
 * @param userId The user ID to get notifications for
 * @returns Promise<any[]> Array of notifications
 */
export const getUnreadNotifications = async (userId: string): Promise<any[]> => {
  try {
    // First check if the notifications table exists
    const { error: tableCheckError } = await supabase
      .from('notifications')
      .select('id')
      .limit(1);

    if (tableCheckError) {
      console.error("Notifications table may not exist yet:", tableCheckError);
      return [];
    }

    // Get notifications without the join first
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .eq('is_read', false)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching notifications:", error);
      return [];
    }

    // If we have notifications, fetch the event titles separately
    if (data && data.length > 0) {
      const eventIds = data.map(notification => notification.event_id);

      const { data: eventsData } = await supabase
        .from('events')
        .select('id, title')
        .in('id', eventIds);

      // Add the event title to each notification
      const enrichedNotifications = data.map(notification => {
        const event = eventsData?.find(e => e.id === notification.event_id);
        return {
          ...notification,
          event: event ? { title: event.title } : { title: 'Unknown Event' }
        };
      });

      return enrichedNotifications;
    }

    return data || [];
  } catch (error) {
    console.error("Error in getUnreadNotifications:", error);
    return [];
  }
};

/**
 * Mark a notification as read
 * @param notificationId The notification ID to mark as read
 * @returns Promise<boolean> True if the notification was marked as read successfully
 */
export const markNotificationAsRead = async (notificationId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    if (error) {
      console.error("Error marking notification as read:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error in markNotificationAsRead:", error);
    return false;
  }
};

/**
 * Subscribe to real-time notifications for a user
 * @param userId The user ID to subscribe to notifications for
 * @param callback Function to call when a new notification is received
 * @returns Function to unsubscribe from notifications
 */
export const subscribeToNotifications = (
  userId: string,
  callback: (notification: any) => void
): (() => void) => {
  const subscription = supabase
    .channel('public:notifications')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      },
      (payload) => {
        // Show a toast notification
        toast.info(payload.new.message, {
          id: payload.new.id,
          duration: 5000,
        });

        // Call the callback with the new notification
        callback(payload.new);
      }
    )
    .subscribe();

  // Return a function to unsubscribe
  return () => {
    supabase.removeChannel(subscription);
  };
};
