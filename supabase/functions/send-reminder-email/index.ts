import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

interface ReminderEmailRequest {
  recipientEmail: string;
  recipientName: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  eventLocation: string;
  eventDescription?: string;
  organizerName?: string;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }

  try {
    const { 
      recipientEmail, 
      recipientName, 
      eventTitle, 
      eventDate, 
      eventTime, 
      eventLocation,
      eventDescription,
      organizerName
    } = await req.json() as ReminderEmailRequest;

    // Email credentials from environment variables or use the provided ones
    const smtpServer = "smtp.gmail.com";
    const smtpPort = 587;
    const emailAddress = "connectin24service@gmail.com";  // Your email address
    const emailPassword = "utrm iiie rcvc vnnj";  // App-specific password

    if (!emailAddress || !emailPassword) {
      throw new Error("Email credentials are not configured");
    }

    // Create email content with HTML
    const subject = `Reminder: ${eventTitle} - ${eventDate}`;
    const boundary = "boundary-" + Math.random().toString().substr(2);
    
    // HTML email content with a clean, modern design
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Event Reminder</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .email-container { max-width: 600px; margin: 0 auto; border: 1px solid #eaeaea; border-radius: 8px; overflow: hidden; }
        .header { background-color: #5c4e8e; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .footer { background-color: #f9f9f9; padding: 15px; text-align: center; font-size: 12px; color: #666; }
        .event-info { background-color: #f9f9f9; border-left: 4px solid #5c4e8e; padding: 15px; margin: 15px 0; }
        h1 { margin: 0; font-size: 24px; }
        h2 { font-size: 20px; margin-top: 0; }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <h1>${eventTitle} - Event Reminder</h1>
        </div>
        <div class="content">
          <p>Hello ${recipientName || 'Attendee'},</p>
          <p>This is a friendly reminder about the upcoming event:</p>
          
          <div class="event-info">
            <h2>Event Details</h2>
            <p><strong>Date:</strong> ${eventDate}</p>
            <p><strong>Time:</strong> ${eventTime}</p>
            <p><strong>Location:</strong> ${eventLocation}</p>
            ${eventDescription ? `<p><strong>Description:</strong> ${eventDescription}</p>` : ''}
          </div>
          
          <p>We're looking forward to seeing you there!</p>
          <p>Best regards,<br>${organizerName || 'The Event Team'}</p>
        </div>
        <div class="footer">
          <p>This email was sent by Eventro Event Management System</p>
          <p>If you have any questions, please don't hesitate to contact us.</p>
        </div>
      </div>
    </body>
    </html>
    `;

    // Construct email
    const message = [
      `From: Eventro <${emailAddress}>`,
      `To: ${recipientName || 'Attendee'} <${recipientEmail}>`,
      `Subject: ${subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/mixed; boundary=${boundary}`,
      '',
      `--${boundary}`,
      `Content-Type: text/html; charset=utf-8`,
      '',
      htmlContent,
      '',
      `--${boundary}--`
    ].join('\r\n');

    // Connect to SMTP server and send email
    const conn = await Deno.connect({
      hostname: smtpServer,
      port: smtpPort
    });

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    // Helper function to send command and get response
    async function command(cmd, expectedCode) {
      const writer = conn.writable.getWriter();
      await writer.write(encoder.encode(cmd + '\r\n'));
      writer.releaseLock();

      const reader = conn.readable.getReader();
      const result = await reader.read();
      const response = decoder.decode(result.value);
      reader.releaseLock();

      if (!response.startsWith(expectedCode)) {
        throw new Error(`SMTP error: ${response}`);
      }
      return response;
    }

    // SMTP communication
    await command('', '220'); // Wait for server greeting
    await command(`HELO example.com`, '250');
    await command('STARTTLS', '220');

    // Upgrade connection to TLS
    const tls = await Deno.startTls(conn, {
      hostname: smtpServer
    });

    // Continue with authentication and sending over TLS
    const tlsCommand = async (cmd, expectedCode) => {
      const writer = tls.writable.getWriter();
      await writer.write(encoder.encode(cmd + '\r\n'));
      writer.releaseLock();

      const reader = tls.readable.getReader();
      const result = await reader.read();
      const response = decoder.decode(result.value);
      reader.releaseLock();

      if (!response.startsWith(expectedCode)) {
        throw new Error(`SMTP TLS error: ${response}`);
      }
      return response;
    };

    await tlsCommand(`EHLO example.com`, '250');
    await tlsCommand('AUTH LOGIN', '334');
    await tlsCommand(btoa(emailAddress), '334');
    await tlsCommand(btoa(emailPassword), '235');
    await tlsCommand(`MAIL FROM:<${emailAddress}>`, '250');
    await tlsCommand(`RCPT TO:<${recipientEmail}>`, '250');
    await tlsCommand('DATA', '354');
    await tlsCommand(message + '\r\n.', '250');
    await tlsCommand('QUIT', '221');

    tls.close();

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Reminder email sent successfully" 
      }),
      { 
        status: 200, 
        headers: { 
          "Content-Type": "application/json",
          ...corsHeaders
        } 
      }
    );
    
  } catch (error) {
    console.error("Error sending reminder email:", error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || "Failed to send reminder email" 
      }),
      { 
        status: 500, 
        headers: { 
          "Content-Type": "application/json",
          ...corsHeaders
        } 
      }
    );
  }
});
