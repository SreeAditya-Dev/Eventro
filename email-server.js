const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3001;

// SMTP Configuration
const SMTP_CONFIG = {
  server: "smtp.gmail.com",
  port: 587,
  email: "connectin24service@gmail.com",
  password: "utrm iiie rcvc vnnj"
};

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Email sending endpoint
app.post('/send-email', async (req, res) => {
  try {
    const { to, subject, html, from } = req.body;
    
    // Validate required fields
    if (!to || !subject || !html) {
      return res.status(400).json({ 
        error: "Missing required fields: to, subject, and html are required" 
      });
    }
    
    console.log(`Attempting to send email to: ${to}`);
    
    // Create a transporter
    const transporter = nodemailer.createTransport({
      host: SMTP_CONFIG.server,
      port: SMTP_CONFIG.port,
      secure: false, // true for 465, false for other ports
      auth: {
        user: SMTP_CONFIG.email,
        pass: SMTP_CONFIG.password
      }
    });
    
    // Send the email
    const info = await transporter.sendMail({
      from: from || `Event Manager <${SMTP_CONFIG.email}>`,
      to,
      subject,
      html
    });
    
    console.log("Email sent successfully:", info.messageId);
    
    res.status(200).json({
      success: true,
      message: "Email sent successfully",
      messageId: info.messageId
    });
  } catch (error) {
    console.error("Error sending email:", error);
    
    res.status(500).json({
      error: error.message || "Failed to send email",
      details: {
        message: error.message,
        type: error.name || "UnknownError",
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Email server running on port ${PORT}`);
});

// Instructions for use:
/*
To use this email server:

1. Install the required dependencies:
   npm install express nodemailer cors body-parser

2. Run the server:
   node email-server.js

3. Send a POST request to http://localhost:3001/send-email with the following JSON body:
   {
     "to": "recipient@example.com",
     "subject": "Email Subject",
     "html": "<p>Email content in HTML format</p>",
     "from": "Optional Sender <sender@example.com>"
   }

4. The server will respond with a success message or an error message.
*/
