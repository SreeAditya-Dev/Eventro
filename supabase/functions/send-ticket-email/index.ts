
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailRequestBody {
  recipientEmail: string;
  recipientName: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  eventLocation: string;
  ticketCode: string;
  pdfAttachment: string;
  fileName: string;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const {
      recipientEmail,
      recipientName,
      eventTitle,
      eventDate,
      eventTime,
      eventLocation,
      ticketCode,
      pdfAttachment,
      fileName
    } = await req.json() as EmailRequestBody;

    // Email credentials from environment variables or use the provided ones
    const smtpServer = "smtp.gmail.com";
    const smtpPort = 587;
    const emailAddress = "connectin24service@gmail.com";  // Your email address
    const emailPassword = "utrm iiie rcvc vnnj";  // App-specific password

    if (!emailAddress || !emailPassword) {
      throw new Error("Email credentials are not configured");
    }

    // Create email content with HTML
    const subject = `Your Ticket for ${eventTitle}`;
    const boundary = "boundary-" + Math.random().toString().substr(2);
    
    // HTML email content with a clean, modern design
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your Event Ticket</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .email-container { max-width: 600px; margin: 0 auto; border: 1px solid #eaeaea; border-radius: 8px; overflow: hidden; }
        .header { background-color: #805AD5; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .footer { background-color: #f9f9f9; padding: 15px; text-align: center; font-size: 12px; color: #666; }
        .ticket-info { background-color: #f0ebfa; border-radius: 6px; padding: 15px; margin: 15px 0; }
        .ticket-code { font-family: monospace; background: #e9e3f5; padding: 5px 10px; border-radius: 4px; font-weight: bold; color: #805AD5; }
        .button { background-color: #805AD5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block; margin-top: 20px; }
        h1 { margin: 0; font-size: 24px; }
        h2 { font-size: 20px; margin-top: 0; }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <h1>Your Event Ticket</h1>
        </div>
        <div class="content">
          <p>Hello ${recipientName},</p>
          <p>Thank you for registering for <strong>${eventTitle}</strong>! Your ticket is attached to this email.</p>
          
          <div class="ticket-info">
            <h2>Event Details</h2>
            <p><strong>Date:</strong> ${eventDate}</p>
            <p><strong>Time:</strong> ${eventTime}</p>
            <p><strong>Location:</strong> ${eventLocation}</p>
            <p><strong>Ticket Code:</strong> <span class="ticket-code">${ticketCode}</span></p>
          </div>
          
          <p>Please bring this ticket (printed or on your mobile device) to the event for check-in.</p>
          <p>We're looking forward to seeing you there!</p>
        </div>
        <div class="footer">
          <p>This email was sent by Eventro Event Management System</p>
        </div>
      </div>
    </body>
    </html>
    `;

    // Construct email with attachment
    const message = [
      `From: Eventro <${emailAddress}>`,
      `To: ${recipientName} <${recipientEmail}>`,
      `Subject: ${subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/mixed; boundary=${boundary}`,
      '',
      `--${boundary}`,
      `Content-Type: text/html; charset=utf-8`,
      '',
      htmlContent,
      '',
      `--${boundary}`,
      `Content-Type: application/pdf`,
      `Content-Disposition: attachment; filename="${fileName}"`,
      `Content-Transfer-Encoding: base64`,
      '',
      pdfAttachment,
      '',
      `--${boundary}--`
    ].join('\r\n');

    // Connect to SMTP server and send email
    const conn = await Deno.connect({
      hostname: smtpServer,
      port: smtpPort,
    });

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    // Helper function to send command and get response
    async function command(cmd: string, expectedCode: string) {
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
      hostname: smtpServer,
    });

    // Continue with authentication and sending over TLS
    const tlsCommand = async (cmd: string, expectedCode: string) => {
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
      JSON.stringify({ success: true, message: "Email sent successfully" }),
      { 
        status: 200, 
        headers: { 
          "Content-Type": "application/json",
          ...corsHeaders
        } 
      }
    );
    
  } catch (error: any) {
    console.error("Error sending email:", error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || "Failed to send email" 
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
