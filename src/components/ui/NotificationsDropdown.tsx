import { useState, useEffect } from "react";
import { Bell, Check, Calendar, Package, MessageSquare, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { getUnreadNotifications, markNotificationAsRead, subscribeToNotifications, NotificationType } from "@/utils/notificationService";

interface Notification {
  id: string;
  message: string;
  type: NotificationType;
  created_at: string;
  event: {
    title: string;
  };
}

export function NotificationsDropdown() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (!data || !data.user) return;

        const unreadNotifications = await getUnreadNotifications(data.user.id);
        setNotifications(unreadNotifications);
      } catch (error) {
        console.error("Error in fetchNotifications:", error);
        // Don't set notifications if there's an error
      }
    };

    fetchNotifications();

    // Subscribe to real-time notifications
    let unsubscribe = () => {};

    // Get the current user asynchronously
    const setupSubscription = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data || !data.user) return;

      unsubscribe = subscribeToNotifications(data.user.id, (newNotification) => {
      // Fetch the event title for the new notification
      const fetchEventTitle = async () => {
        try {
          const { data, error } = await supabase
            .from('events')
            .select('title')
            .eq('id', newNotification.event_id)
            .single();

          if (data && !error) {
            setNotifications(prev => [
              {
                ...newNotification,
                event: { title: data.title }
              },
              ...prev
            ]);
          } else {
            // If we can't get the event title, still show the notification
            setNotifications(prev => [
              {
                ...newNotification,
                event: { title: 'Event' }
              },
              ...prev
            ]);
          }
        } catch (error) {
          console.error("Error fetching event title:", error);
          // Still show the notification even if there's an error
          setNotifications(prev => [
            {
              ...newNotification,
              event: { title: 'Event' }
            },
            ...prev
          ]);
        }
      };

      fetchEventTitle();
      });
    };

    // Call the setup function
    setupSubscription();

    // Cleanup subscription on unmount
    return () => {
      unsubscribe();
    };
  }, []);

  const handleMarkAsRead = async (notificationId: string) => {
    const success = await markNotificationAsRead(notificationId);
    if (success) {
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    }
  };

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case NotificationType.REGISTRATION:
        return <Check className="h-4 w-4 text-green-500" />;
      case NotificationType.CHECK_IN:
        return <Calendar className="h-4 w-4 text-blue-500" />;
      case NotificationType.DISTRIBUTION:
        return <Package className="h-4 w-4 text-purple-500" />;
      case NotificationType.FEEDBACK:
        return <MessageSquare className="h-4 w-4 text-yellow-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {notifications.length > 0 && (
            <Badge
              className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-red-500 text-white"
              variant="destructive"
            >
              {notifications.length}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between p-2 border-b">
          <h3 className="font-medium">Notifications</h3>
          {notifications.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => {
                // Mark all as read
                notifications.forEach(async (notification) => {
                  await markNotificationAsRead(notification.id);
                });
                setNotifications([]);
              }}
            >
              Mark all as read
            </Button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.length > 0 ? (
            notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className="flex items-start p-3 cursor-default hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <div className="flex-shrink-0 mr-3 mt-1">
                  {getNotificationIcon(notification.type as NotificationType)}
                </div>
                <div className="flex-1">
                  <p className="text-sm">{notification.message}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {format(new Date(notification.created_at), "MMM d, h:mm a")}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="ml-2 h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMarkAsRead(notification.id);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </DropdownMenuItem>
            ))
          ) : (
            <div className="p-4 text-center text-gray-500">
              <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p>No new notifications</p>
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
