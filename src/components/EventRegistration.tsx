
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Ticket, CreditCard, Loader2, Download, Mail, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { generateTicketPDF } from "@/utils/ticketGenerator";
import { sendTicketByEmail } from "@/utils/emailService";
import { useNavigate } from "react-router-dom";
import { getDynamicPricing } from "@/services/recommendationService";
import { Badge } from "@/components/ui/badge";

interface EventRegistrationProps {
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventLocation: string;
  eventOrganizer: string;
  price: string;
}

export function EventRegistration({
  eventId,
  eventTitle,
  eventDate,
  eventLocation,
  eventOrganizer,
  price
}: EventRegistrationProps) {
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userData, setUserData] = useState<{ id: string; email: string } | null>(null);
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const [ticketData, setTicketData] = useState<any>(null);
  const [dynamicPricing, setDynamicPricing] = useState<{
    discountedPrice: number;
    discountPercentage: number;
    reason: string;
  } | null>(null);
  const [loadingDiscount, setLoadingDiscount] = useState(false);
  const navigate = useNavigate();

  // Parse the base price
  const basePrice = price === "Free" ? 0 : parseFloat(price.replace("$", ""));

  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();
      setIsAuthenticated(!!data.session);

      if (data.session) {
        setUserData({
          id: data.session.user.id,
          email: data.session.user.email || ""
        });

        // If the event is not free, fetch dynamic pricing
        if (basePrice > 0) {
          fetchDynamicPricing(data.session.user.id);
        }
      }
    };

    checkAuth();
  }, [basePrice]);

  const fetchDynamicPricing = async (userId: string) => {
    if (basePrice <= 0) return; // Don't calculate discounts for free events

    setLoadingDiscount(true);
    try {
      const pricing = await getDynamicPricing(userId, eventId, basePrice);
      setDynamicPricing(pricing);
    } catch (error) {
      console.error("Error fetching dynamic pricing:", error);
    } finally {
      setLoadingDiscount(false);
    }
  };

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value > 0 && value <= 10) {
      setQuantity(value);
    }
  };

  const handleRegister = async () => {
    if (!isAuthenticated) {
      toast.error("Please log in to register for this event");
      navigate("/login");
      return;
    }

    setLoading(true);

    try {
      // Get user profile data for the ticket
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('first_name, last_name, email')
        .eq('id', userData?.id)
        .single();

      if (profileError || !profileData) {
        toast.error("Could not find your profile information");
        return;
      }

      const fullName = `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim();

      // Generate a unique ticket code - simple format that's easy to scan
      const generateSimpleTicketCode = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed similar-looking characters
        let result = '';
        for (let i = 0; i < 8; i++) {
          result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
      };

      const ticketCode = generateSimpleTicketCode();

      // Store ticket in database
      const { data, error } = await supabase
        .from('event_tickets')
        .insert({
          event_id: eventId,
          user_id: userData?.id,
          purchase_date: new Date().toISOString(),
          ticket_code: ticketCode,
          quantity: quantity
        })
        .select()
        .single();

      if (error) throw error;

      // Create ticket object for PDF generation
      const ticket = {
        id: data.id,
        ticket_code: ticketCode,
        event: {
          title: eventTitle,
          date: eventDate,
          location: eventLocation,
          organizer: eventOrganizer
        }
      };

      setTicketData({
        ticket,
        fullName
      });

      // Update the database to increase attendee count using RPC
      await supabase.rpc('increment_attendees', {
        event_id_param: eventId,
        increment_by: quantity
      });

      toast.success(`Registration successful for ${eventTitle}!`);
      setRegistrationComplete(true);

    } catch (error) {
      console.error("Registration error:", error);
      toast.error("Failed to complete registration. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTicket = async () => {
    if (!ticketData) return;

    try {
      await generateTicketPDF(ticketData.ticket, ticketData.fullName);
      toast.success("Ticket downloaded successfully");
    } catch (error) {
      console.error("Error downloading ticket:", error);
      toast.error("Failed to download ticket");
    }
  };

  const handleEmailTicket = async () => {
    if (!ticketData) return;

    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', userData?.id)
        .single();

      if (!profileData?.email) {
        toast.error("Could not find your email address");
        return;
      }

      toast.promise(
        sendTicketByEmail(ticketData.ticket, ticketData.fullName, profileData.email),
        {
          loading: "Sending ticket to your email...",
          success: "Ticket sent to your email!",
          error: "Failed to send ticket. Please try again."
        }
      );
    } catch (error) {
      console.error("Error emailing ticket:", error);
      toast.error("Failed to send ticket by email");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Register for this Event</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!registrationComplete ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="quantity">Number of Tickets</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                max="10"
                value={quantity}
                onChange={handleQuantityChange}
              />
            </div>

            <div className="flex justify-between items-center py-2">
              <span>Price per ticket:</span>
              <span className="font-semibold">{price === "Free" ? "Free" : price}</span>
            </div>

            {isAuthenticated && dynamicPricing && dynamicPricing.discountPercentage > 0 && (
              <div className="flex justify-between items-center py-2 bg-orange-50 px-3 rounded-md">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-orange-500" />
                  <span className="text-sm">Personalized discount:</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-orange-100 text-orange-700 hover:bg-orange-100">
                    {dynamicPricing.discountPercentage}% OFF
                  </Badge>
                  <span className="text-sm text-orange-700">{dynamicPricing.reason}</span>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center py-2 border-t pt-4">
              <span className="text-lg font-medium">Total:</span>
              {price === "Free" ? (
                <span className="text-lg font-bold">Free</span>
              ) : dynamicPricing && dynamicPricing.discountPercentage > 0 ? (
                <div className="flex flex-col items-end">
                  <span className="text-sm line-through text-gray-500">${basePrice * quantity}</span>
                  <span className="text-lg font-bold text-orange-600">
                    ${(dynamicPricing.discountedPrice * quantity).toFixed(2)}
                  </span>
                </div>
              ) : (
                <span className="text-lg font-bold">${(basePrice * quantity).toFixed(2)}</span>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center space-y-4 py-4">
            <div className="bg-green-100 text-green-700 p-3 rounded-full">
              <Ticket className="h-8 w-8" />
            </div>
            <h3 className="font-medium text-xl">Registration Complete!</h3>
            <p className="text-center text-gray-500">
              Your ticket has been reserved. You can download it or have it sent to your email.
            </p>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col space-y-3">
        {!registrationComplete ? (
          <Button
            onClick={handleRegister}
            className="w-full bg-event-purple hover:bg-event-purple/90"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                {price === "Free" ? (
                  <>
                    <Ticket className="mr-2 h-4 w-4" />
                    Register Now
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Pay & Register
                  </>
                )}
              </>
            )}
          </Button>
        ) : (
          <div className="w-full space-y-3">
            <Button
              onClick={handleDownloadTicket}
              className="w-full bg-event-purple hover:bg-event-purple/90"
            >
              <Download className="mr-2 h-4 w-4" />
              Download Ticket
            </Button>
            <Button
              onClick={handleEmailTicket}
              variant="outline"
              className="w-full"
            >
              <Mail className="mr-2 h-4 w-4" />
              Email Ticket
            </Button>
          </div>
        )}
      </CardFooter>
    </Card>
  );
};
