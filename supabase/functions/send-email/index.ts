
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

// SMTP Configuration
const SMTP_SERVER = Deno.env.get("SMTP_SERVER") || "smtp.gmail.com";
const SMTP_PORT = parseInt(Deno.env.get("SMTP_PORT") || "587");
const EMAIL_ADDRESS = Deno.env.get("EMAIL_ADDRESS") || "connectin24service@gmail.com";
const EMAIL_PASSWORD = Deno.env.get("EMAIL_PASSWORD") || "utrm iiie rcvc vnnj";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendEmailRequest {
  to: string;
  subject: string;
  html: string;
  eventId?: string;
}

/**
 * Send an email using SMTP
 */
const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse the request body
    const requestData: SendEmailRequest = await req.json();
    const { to, subject, html, eventId } = requestData;

    // Validate required fields
    if (!to || !subject || !html) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: to, subject, and html are required"
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders
          },
        }
      );
    }

    console.log(`Attempting to send email to: ${to}`);
    console.log(`Using SMTP server: ${SMTP_SERVER}:${SMTP_PORT}`);
    console.log(`Using email address: ${EMAIL_ADDRESS}`);
    console.log(`Password provided: ${EMAIL_PASSWORD ? "Yes" : "No"}`);

    try {
      // Initialize SMTP client
      const client = new SmtpClient();

      try {
        // Connect to SMTP server
        console.log("Connecting to SMTP server...");
        await client.connectTLS({
          hostname: SMTP_SERVER,
          port: SMTP_PORT,
          username: EMAIL_ADDRESS,
          password: EMAIL_PASSWORD,
        });

        console.log("Connected to SMTP server successfully");

        // Send the email
        console.log("Sending email...");
        const sendResult = await client.send({
          from: `Event Manager <${EMAIL_ADDRESS}>`,
          to: [to],
          subject: subject,
          content: html,
          html: html,
        });

        // Close the connection
        await client.close();

        console.log("Email sent successfully:", sendResult);
        return sendResult;
      } catch (smtpError) {
        console.error("SMTP error:", smtpError);

        // Try to close the connection if it was opened
        try {
          await client.close();
        } catch (closeError) {
          console.error("Error closing SMTP connection:", closeError);
        }

        throw new Error(`SMTP error: ${smtpError.message}`);
      }
    } catch (error) {
      console.error("Email client error:", error);
      throw error;
    }

    // If there's an eventId provided, update the reminder status to sent
    if (eventId) {
      console.log(`Email sent for event ${eventId}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Email sent successfully",
        data: { sent: true },
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in send-email function:", error);

    // Create a more detailed error response
    const errorDetails = {
      message: error.message || "Failed to send email",
      type: error.name || "UnknownError",
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      timestamp: new Date().toISOString()
    };

    return new Response(
      JSON.stringify({
        error: errorDetails.message,
        details: errorDetails,
        suggestion: "Please try using your own email client or contact the administrator to set up the email service."
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  }
};

serve(handler);
