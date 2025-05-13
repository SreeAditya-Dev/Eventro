
import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AttendeeUpload from "@/components/admin/AttendeeUpload";
import CheckIn from "@/components/admin/CheckIn";
import Distribution from "@/components/admin/Distribution";
import Dashboard from "@/components/admin/Dashboard";
import UserEvents from "@/components/admin/UserEvents";
import { FeedbackManagement } from "@/components/admin/FeedbackManagement";
import Messages from "@/components/admin/Messages";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const Admin = () => {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        toast({
          title: "Authentication required",
          description: "Please log in to access the admin area",
          variant: "destructive",
        });
        navigate("/login");
        return;
      }
      setAuthenticated(true);
      setLoading(false);
    };

    checkAuth();
  }, [navigate, toast]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-event-purple" />
        <span className="ml-2 text-lg">Loading...</span>
      </div>
    );
  }

  if (!authenticated) {
    return null;
  }

  return (
    <div className="container px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Event Management</h1>

      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="events">My Events</TabsTrigger>
          <TabsTrigger value="upload">Attendee Upload</TabsTrigger>
          <TabsTrigger value="check-in">Check-In</TabsTrigger>
          <TabsTrigger value="distribution">Distribution</TabsTrigger>
          <TabsTrigger value="feedback">Feedback</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <Dashboard />
        </TabsContent>

        <TabsContent value="events">
          <UserEvents />
        </TabsContent>

        <TabsContent value="upload">
          <AttendeeUpload />
        </TabsContent>

        <TabsContent value="check-in">
          <CheckIn />
        </TabsContent>

        <TabsContent value="distribution">
          <Distribution />
        </TabsContent>

        <TabsContent value="feedback">
          <FeedbackManagement />
        </TabsContent>

        <TabsContent value="messages">
          <Messages />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;
