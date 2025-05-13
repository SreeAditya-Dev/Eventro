
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

interface EventDetails {
  title: string;
  date: string;
  location?: string;
  description?: string;
  isTodayEvent?: boolean;
  reminders?: Array<{
    title: string;
    description: string;
  }>;
}

interface EmailResponse {
  subject: string;
  content: string; // HTML formatted email content
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body
    const eventDetails = await req.json() as EventDetails;
    console.log("Received event details:", JSON.stringify(eventDetails));

    if (!eventDetails || !eventDetails.title) {
      return new Response(
        JSON.stringify({ error: 'Event details are required' }),
        { 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders 
          }, 
          status: 400 
        }
      );
    }

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 800));

    // Format the event date (if it exists)
    let formattedDate = '';
    if (eventDetails.date) {
      const eventDate = new Date(eventDetails.date);
      formattedDate = eventDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }

    // Generate email content
    const subject = `Reminder: ${eventDetails.title} - ${formattedDate}`;
    
    // Create a personalized email content
    let content = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
        <h2 style="color: #5c4e8e;">${eventDetails.title} - Event Reminder</h2>
        
        <p>Dear Attendee,</p>
    `;

    // Add urgent message if the event is today
    if (eventDetails.isTodayEvent) {
      content += `
        <p style="color: #e53e3e; font-weight: bold;">⚠️ This event is happening TODAY! ⚠️</p>
      `;
    } else {
      content += `
        <p>This is a friendly reminder about the upcoming event:</p>
      `;
    }
    
    content += `
      <div style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid #5c4e8e; margin: 20px 0;">
        <p><strong>Date:</strong> ${formattedDate}</p>
    `;

    // Add location if available
    if (eventDetails.location) {
      content += `<p><strong>Location:</strong> ${eventDetails.location}</p>`;
    }

    content += `</div>`;
    
    // Add event description if available
    if (eventDetails.description) {
      content += `
        <h3>Event Details:</h3>
        <p>${eventDetails.description}</p>
      `;
    }
    
    // Add reminders if available
    if (eventDetails.reminders && eventDetails.reminders.length > 0) {
      content += `
        <h3>Important Reminders:</h3>
        <ul style="list-style-type: disc; padding-left: 20px;">
      `;
      
      eventDetails.reminders.forEach(reminder => {
        content += `<li><strong>${reminder.title}</strong>: ${reminder.description}</li>`;
      });
      
      content += `</ul>`;
    }
    
    // Add closing message
    content += `
        <p>We're looking forward to seeing you there!</p>
        
        <p>Best regards,<br>The Event Team</p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #777;">
          <p>If you have any questions, please don't hesitate to contact us.</p>
        </div>
      </div>
    `;

    const response: EmailResponse = {
      subject,
      content
    };

    console.log("Generated email response");
    
    return new Response(
      JSON.stringify(response),
      { 
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        } 
      }
    );
  } catch (error: any) {
    console.error("Error in generate-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to generate email content' }),
      { 
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        }, 
        status: 500 
      }
    );
  }
});
