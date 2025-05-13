
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export async function sendTicketByEmail(ticket, attendeeName, recipientEmail) {
  try {
    // First generate a PDF file as base64 string
    const pdfFile = await generatePdfAsBase64(ticket, attendeeName);

    // Prepare the file name
    const fileName = `ticket-${ticket.event.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.pdf`;

    // Get an ISO date string for the event
    const eventDate = new Date(ticket.event.date);
    const formattedDate = eventDate.toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Get formatted time
    const formattedTime = eventDate.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });

    // Call the Supabase Edge Function to send email with PDF attachment
    const { data, error } = await supabase.functions.invoke("send-ticket-email", {
      body: {
        recipientEmail,
        recipientName: attendeeName,
        eventTitle: ticket.event.title,
        eventDate: formattedDate,
        eventTime: formattedTime,
        eventLocation: ticket.event.location,
        ticketCode: ticket.ticket_code,
        pdfAttachment: pdfFile,
        fileName
      }
    });

    if (error) throw error;

    return data;
  } catch (error) {
    console.error("Error in sendTicketByEmail:", error);
    throw error;
  }
}

// Helper function to generate PDF as base64 string
async function generatePdfAsBase64(ticket, attendeeName) {
  // Dynamically import jsPDF to avoid SSR issues
  const { default: jsPDF } = await import("jspdf");
  const QRCode = await import("qrcode");

  // Create a new PDF document - using portrait orientation to match the reference image
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a5"
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Set white background
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, pageHeight, "F");

  // Add a clean white card with subtle shadow effect
  const margin = 10;
  const cardWidth = pageWidth - (margin * 2);
  const cardHeight = pageHeight - (margin * 2);

  // Draw card background
  doc.setFillColor(250, 250, 250);
  doc.roundedRect(margin, margin, cardWidth, cardHeight, 3, 3, 'F');

  // Add green accent line on the left side
  const accentWidth = 5;
  doc.setFillColor(40, 167, 69); // Green color
  doc.rect(margin, margin, accentWidth, cardHeight, 'F');

  // Add actual logo at the top left
  const logoSize = 15;
  const logoX = margin + accentWidth + 5;
  const logoY = margin + 10;

  // Load logo image
  const logoPath = 'public/logo.png';
  try {
    // Add logo image
    doc.addImage(logoPath, 'PNG', logoX, logoY, logoSize, logoSize);
  } catch (error) {
    console.error("Error loading logo:", error);
    // Fallback to a colored circle if logo can't be loaded
    doc.setFillColor(40, 167, 69); // Green color
    doc.circle(logoX + (logoSize/2), logoY + (logoSize/2), logoSize/2, 'F');

    // Add "Your Logo" text in white
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text("Your Logo", logoX + (logoSize/2), logoY + (logoSize/2) + 2, { align: 'center' });
  }

  // Generate QR code
  const qrData = JSON.stringify({
    ticket_code: ticket.ticket_code,
    event_id: ticket.event.title,
    attendee: attendeeName,
    date: ticket.event.date
  });

  // Generate QR code as data URL
  const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
    width: 150,
    margin: 1,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    }
  });

  // Add QR code on the left side
  const qrSize = 30;
  const qrX = logoX;
  const qrY = logoY + logoSize + 10;

  // Add QR code
  doc.addImage(qrCodeDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);

  // Add ticket number below QR code
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.setFont("helvetica", "normal");
  doc.text(ticket.ticket_code, qrX + (qrSize/2), qrY + qrSize + 5, { align: 'center' });

  // Add event details on the right side
  const contentX = qrX + qrSize + 10;
  let contentY = margin + 15;
  const lineHeight = 7;

  // Event title
  doc.setFontSize(14);
  doc.setTextColor(50, 50, 50);
  doc.setFont("helvetica", "bold");
  doc.text(ticket.event.title, contentX, contentY);
  contentY += lineHeight * 1.5;

  // Event details with labels
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);

  // Date and Time
  const eventDate = new Date(ticket.event.date);
  doc.setFont("helvetica", "bold");
  doc.text("Date:", contentX, contentY);
  doc.setFont("helvetica", "normal");
  doc.text(eventDate.toLocaleDateString(), contentX + 15, contentY);
  contentY += lineHeight;

  doc.setFont("helvetica", "bold");
  doc.text("Time:", contentX, contentY);
  doc.setFont("helvetica", "normal");
  doc.text(`${eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`, contentX + 15, contentY);
  contentY += lineHeight;

  // Location
  doc.setFont("helvetica", "bold");
  doc.text("Location:", contentX, contentY);
  doc.setFont("helvetica", "normal");
  doc.text(ticket.event.location, contentX + 15, contentY);
  contentY += lineHeight;

  // Organizer
  doc.setFont("helvetica", "bold");
  doc.text("Organizer:", contentX, contentY);
  doc.setFont("helvetica", "normal");
  doc.text(ticket.event.organizer, contentX + 15, contentY);
  contentY += lineHeight;

  // Add a separator line
  contentY += 3;
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.5);
  doc.line(contentX, contentY, pageWidth - margin, contentY);
  contentY += 5;

  // Ticket details
  doc.setFont("helvetica", "bold");
  doc.text("Ticket Number:", contentX, contentY);
  doc.setFont("helvetica", "normal");
  doc.text(ticket.ticket_code, contentX + 25, contentY);
  contentY += lineHeight;

  doc.setFont("helvetica", "bold");
  doc.text("Ticket Holder:", contentX, contentY);
  doc.setFont("helvetica", "normal");
  doc.text(attendeeName, contentX + 25, contentY);
  contentY += lineHeight;

  doc.setFont("helvetica", "bold");
  doc.text("Ticket Type:", contentX, contentY);
  doc.setFont("helvetica", "normal");
  doc.text("Standard", contentX + 25, contentY);
  contentY += lineHeight * 1.5;

  // Add to calendar button
  const buttonWidth = 80;
  const buttonHeight = 10;
  const buttonX = contentX + 10;
  const buttonY = contentY;

  // Button background
  doc.setFillColor(40, 167, 69); // Green color
  doc.roundedRect(buttonX, buttonY, buttonWidth, buttonHeight, 2, 2, 'F');

  // Button text
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.text("Add to calendar", buttonX + (buttonWidth/2), buttonY + (buttonHeight/2) + 1, { align: 'center' });

  // Add footer with ticket ID
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.setFont("helvetica", "normal");
  doc.text(`Ticket ID: ${ticket.id} | Generated by Eventro`, pageWidth/2, pageHeight - margin - 5, { align: 'center' });

  // Return PDF as base64 string
  return doc.output('datauristring').split(',')[1];
}
