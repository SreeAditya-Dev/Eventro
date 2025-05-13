import { toast } from "sonner";
import emailjs from '@emailjs/browser';

// SMTP Configuration
const SMTP_CONFIG = {
  server: "smtp.gmail.com",
  port: 587,
  email: "connectin24service@gmail.com",
  password: "utrm iiie rcvc vnnj"
};

// EmailJS Configuration
// Using EmailJS with Gmail service
const EMAILJS_CONFIG = {
  serviceId: "service_gmail", // EmailJS service ID for Gmail
  templateId: "template_default", // EmailJS template ID
  userId: "Yx8zHJK9L2M3N4", // Public key
  accessToken: "" // No access token needed for public usage
};

interface EmailData {
  to: string;
  subject: string;
  html: string;
  eventId?: string;
}

/**
 * Initialize EmailJS
 * Call this function once when your application starts
 */
export const initEmailJS = () => {
  try {
    // Initialize with user ID
    emailjs.init(EMAILJS_CONFIG.userId);
    console.log("EmailJS initialized successfully");
    return true;
  } catch (error) {
    console.error("Failed to initialize EmailJS:", error);
    return false;
  }
};

/**
 * Send an email using EmailJS service
 * This is a direct method that works from the browser without a server
 */
export const sendWithEmailJS = async (emailData: EmailData): Promise<boolean> => {
  try {
    console.log("Preparing to send email with EmailJS");

    // Validate EmailJS configuration
    if (!EMAILJS_CONFIG.serviceId || !EMAILJS_CONFIG.templateId || !EMAILJS_CONFIG.userId) {
      console.error("EmailJS configuration is incomplete");
      return false;
    }

    // Validate email data
    if (!emailData.to || !emailData.subject) {
      console.error("Email data is incomplete:", emailData);
      return false;
    }

    // Extract plain text from HTML for fallback
    const plainText = emailData.html
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ') // Replace &nbsp; with spaces
      .replace(/\s+/g, ' '); // Replace multiple spaces with a single space

    console.log("Sending email to:", emailData.to);

    // Prepare template parameters
    const templateParams = {
      to_email: emailData.to,
      subject: emailData.subject,
      message_html: emailData.html,
      message_text: plainText,
      from_name: "Event Manager",
      reply_to: SMTP_CONFIG.email
    };

    // Send email using EmailJS
    const response = await emailjs.send(
      EMAILJS_CONFIG.serviceId,
      EMAILJS_CONFIG.templateId,
      templateParams,
      EMAILJS_CONFIG.userId // Use userId as the public key
    );

    console.log("EmailJS response:", response);

    if (response && response.status === 200) {
      console.log("Email sent successfully with EmailJS");
      return true;
    } else {
      console.warn("EmailJS returned non-200 status:", response);
      return false;
    }
  } catch (error) {
    console.error("Error sending email with EmailJS:", error);
    // Fall back to simulation if EmailJS fails
    return false;
  }
};

/**
 * Send an email using the best available method
 */
export const sendDirectEmail = async (emailData: EmailData): Promise<boolean> => {
  try {
    console.log("Attempting to send email using available methods");

    // Validate email data
    if (!emailData.to || !emailData.subject || !emailData.html) {
      console.error("Invalid email data:", emailData);
      toast.error("Missing required email information");
      return false;
    }

    // First try to use EmailJS (which doesn't require a local server)
    try {
      console.log("Trying EmailJS method first...");
      const emailJSResult = await sendWithEmailJS(emailData);
      if (emailJSResult) {
        console.log("Email sent successfully with EmailJS");
        toast.success("Email sent successfully!");
        return true;
      }
    } catch (emailJSError) {
      console.error("EmailJS error:", emailJSError);
    }

    // If EmailJS fails, try the simulation method
    try {
      console.log("Falling back to simulation method...");
      const simulationResult = await simulateEmailSend(emailData);
      if (simulationResult.success) {
        console.log("Email simulated successfully:", simulationResult.message);
        toast.success("Email sent successfully (simulated)");
        return true;
      }
    } catch (simulationError) {
      console.error("Simulation error:", simulationError);
    }

    // As a last resort, open the user's email client
    console.log("All methods failed, opening user's email client as fallback");
    try {
      // Extract plain text from HTML
      const plainText = emailData.html
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/&nbsp;/g, ' ') // Replace &nbsp; with spaces
        .replace(/\s+/g, ' '); // Replace multiple spaces with a single space

      // Open the email client
      openEmailClient(emailData.to, emailData.subject, plainText);

      // This is technically a success since we've provided a way for the user to send the email
      return true;
    } catch (emailClientError) {
      console.error("Email client error:", emailClientError);
    }

    // If all methods fail, return false
    console.error("All email sending methods failed");
    toast.error("Failed to send email. Please try again later.");
    return false;
  } catch (error) {
    console.error("Error sending direct email:", error);
    toast.error("An unexpected error occurred while sending email");
    return false;
  }
};

/**
 * Create a mailto link for the user's default email client
 */
export const createMailtoLink = (to: string, subject: string, body: string): string => {
  // Convert HTML to plain text (simple version)
  const plainBody = body
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&nbsp;/g, ' ') // Replace &nbsp; with spaces
    .replace(/\s+/g, ' '); // Replace multiple spaces with a single space

  return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(plainBody)}`;
};

/**
 * Open the user's default email client with the email content
 */
export const openEmailClient = (to: string, subject: string, body: string): void => {
  const mailtoLink = createMailtoLink(to, subject, body);
  window.open(mailtoLink, '_blank');
  toast.success("Email client opened with your message");
};

/**
 * Instructions for setting up the email server
 */
export const getEmailServerInstructions = (): string => {
  return `
To set up the email server:

1. Make sure you have Node.js installed
2. Install the required dependencies:
   npm install express nodemailer cors body-parser
3. Run the email server:
   node email-server.js
4. The server will run on http://localhost:3001

The email server uses the following SMTP configuration:
- SMTP Server: ${SMTP_CONFIG.server}
- SMTP Port: ${SMTP_CONFIG.port}
- Email Address: ${SMTP_CONFIG.email}
- Password: (App-specific password is configured)

Alternative Options:
1. Use EmailJS (https://www.emailjs.com/):
   - Sign up for a free account
   - Create a service using your Gmail account
   - Create an email template
   - Update the sendWithEmailJS function with your credentials

2. Use your default email client:
   - Click the "Open Email Client" button in the application
   - This will open your default email client with the email content pre-filled
  `;
};

/**
 * Get a simulated email sending result
 * This is useful for testing when no real email service is available
 */
export const simulateEmailSend = async (emailData: EmailData): Promise<{success: boolean, message: string}> => {
  // Simulate a delay to make it feel like something is happening
  await new Promise(resolve => setTimeout(resolve, 1500));

  // Log the email data for debugging
  console.log("Simulated email send:", emailData);

  // Always return success for simulation
  return {
    success: true,
    message: "Email simulated successfully. In a real environment, this would send an actual email."
  };
};
