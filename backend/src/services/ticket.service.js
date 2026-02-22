/**
 * E-Ticket Generation Service for SkyWings
 * Generates PDF e-tickets for flight bookings
 */

const PDFDocument = require('pdfkit');
const logger = require('../config/winstonLogger');

/**
 * Format date for display
 */
const formatDate = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

/**
 * Format time for display
 */
const formatTime = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

/**
 * Generate E-Ticket PDF
 * @param {object} booking - Booking details
 * @returns {Promise<Buffer>} PDF buffer
 */
const generateTicketPDF = (booking) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 }
      });

      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      const flightData = booking.flight_data || booking.flightData;
      const outboundSegment = flightData?.itineraries?.[0]?.segments?.[0];
      const travelers = booking.travelers || [];

      // Colors
      const primaryBlue = '#2563eb';
      const darkBlue = '#1e3a5f';
      const gray = '#64748b';
      const lightGray = '#f1f5f9';
      const green = '#22c55e';

      // ================== HEADER ==================
      doc.rect(0, 0, 612, 100).fill(primaryBlue);
      
      // Logo and brand
      doc.fontSize(28)
         .fillColor('white')
         .text('✈️ SkyWings', 50, 35, { align: 'left' });
      
      doc.fontSize(12)
         .fillColor('rgba(255, 255, 255, 0.8)')
         .text('E-TICKET / ITINERARY RECEIPT', 50, 65, { align: 'left' });

      // Booking Reference on right
      doc.fontSize(10)
         .fillColor('rgba(255, 255, 255, 0.7)')
         .text('BOOKING REFERENCE', 400, 35, { align: 'right' });
      
      doc.fontSize(18)
         .fillColor('white')
         .font('Helvetica-Bold')
         .text(booking.booking_reference, 400, 52, { align: 'right' });

      // ================== MAIN CONTENT ==================
      let yPos = 130;

      // Status bar
      doc.rect(50, yPos, 495, 35).fill(green);
      doc.fontSize(14)
         .fillColor('white')
         .font('Helvetica-Bold')
         .text('✓ CONFIRMED', 60, yPos + 10);
      
      doc.fontSize(10)
         .text(`Issued: ${new Date().toLocaleDateString()}`, 350, yPos + 12, { align: 'right' });

      yPos += 55;

      // Flight Route Section
      doc.rect(50, yPos, 495, 140).lineWidth(1).stroke('#e5e7eb');
      
      // Origin
      doc.fontSize(36)
         .fillColor(darkBlue)
         .font('Helvetica-Bold')
         .text(outboundSegment?.departure?.iataCode || flightData?.origin || 'DEP', 80, yPos + 25);
      
      doc.fontSize(11)
         .fillColor(gray)
         .font('Helvetica')
         .text(formatTime(outboundSegment?.departure?.at), 80, yPos + 75);
      
      doc.text(formatDate(outboundSegment?.departure?.at), 80, yPos + 90);

      // Plane icon and duration in middle
      doc.fontSize(24)
         .fillColor(primaryBlue)
         .text('✈️', 275, yPos + 35);
      
      const duration = outboundSegment?.duration?.replace('PT', '').replace('H', 'h ').replace('M', 'm') || 'Direct';
      doc.fontSize(10)
         .fillColor(gray)
         .text(duration, 265, yPos + 65);
      
      // Arrow line
      doc.strokeColor('#e5e7eb')
         .lineWidth(2)
         .moveTo(160, yPos + 45)
         .lineTo(260, yPos + 45)
         .stroke();
      
      doc.moveTo(305, yPos + 45)
         .lineTo(405, yPos + 45)
         .stroke();

      // Destination
      doc.fontSize(36)
         .fillColor(darkBlue)
         .font('Helvetica-Bold')
         .text(outboundSegment?.arrival?.iataCode || flightData?.destination || 'ARR', 420, yPos + 25);
      
      doc.fontSize(11)
         .fillColor(gray)
         .font('Helvetica')
         .text(formatTime(outboundSegment?.arrival?.at), 420, yPos + 75);
      
      doc.text(formatDate(outboundSegment?.arrival?.at), 420, yPos + 90);

      yPos += 160;

      // Flight Info Row
      doc.rect(50, yPos, 495, 40).fill(lightGray);
      
      const flightNumber = outboundSegment?.carrierCode ? 
        `${outboundSegment.carrierCode} ${outboundSegment.number}` : 'N/A';
      const cabinClass = flightData?.cabin || outboundSegment?.cabin || 'Economy';
      
      // Flight Number
      doc.fontSize(9)
         .fillColor(gray)
         .font('Helvetica')
         .text('FLIGHT', 70, yPos + 8);
      doc.fontSize(12)
         .fillColor(darkBlue)
         .font('Helvetica-Bold')
         .text(flightNumber, 70, yPos + 22);

      // Class
      doc.fontSize(9)
         .fillColor(gray)
         .font('Helvetica')
         .text('CLASS', 200, yPos + 8);
      doc.fontSize(12)
         .fillColor(darkBlue)
         .font('Helvetica-Bold')
         .text(cabinClass, 200, yPos + 22);

      // PNR
      if (booking.pnr) {
        doc.fontSize(9)
           .fillColor(gray)
           .font('Helvetica')
           .text('PNR', 330, yPos + 8);
        doc.fontSize(12)
           .fillColor(primaryBlue)
           .font('Helvetica-Bold')
           .text(booking.pnr, 330, yPos + 22);
      }

      // Passengers
      doc.fontSize(9)
         .fillColor(gray)
         .font('Helvetica')
         .text('PASSENGERS', 430, yPos + 8);
      doc.fontSize(12)
         .fillColor(darkBlue)
         .font('Helvetica-Bold')
         .text(String(travelers.length || 1), 430, yPos + 22);

      yPos += 60;

      // ================== PASSENGER DETAILS ==================
      doc.fontSize(14)
         .fillColor(darkBlue)
         .font('Helvetica-Bold')
         .text('PASSENGER INFORMATION', 50, yPos);
      
      yPos += 25;

      // Passenger list
      travelers.forEach((traveler, index) => {
        doc.rect(50, yPos, 495, 45).lineWidth(1).stroke('#e5e7eb');
        
        // Avatar circle
        doc.circle(80, yPos + 22, 15).fill(primaryBlue);
        doc.fontSize(12)
           .fillColor('white')
           .font('Helvetica-Bold')
           .text((traveler.first_name?.[0] || 'P').toUpperCase(), 74, yPos + 16);
        
        // Name
        doc.fontSize(13)
           .fillColor(darkBlue)
           .font('Helvetica-Bold')
           .text(`${traveler.title || ''} ${traveler.first_name} ${traveler.last_name}`, 110, yPos + 10);
        
        // Type
        doc.fontSize(11)
           .fillColor(gray)
           .font('Helvetica')
           .text(traveler.traveler_type || 'Adult', 110, yPos + 27);

        // Nationality
        if (traveler.nationality) {
          doc.fontSize(10)
             .fillColor(gray)
             .text(`Nationality: ${traveler.nationality}`, 350, yPos + 18);
        }

        yPos += 50;
      });

      yPos += 20;

      // ================== PAYMENT DETAILS ==================
      doc.fontSize(14)
         .fillColor(darkBlue)
         .font('Helvetica-Bold')
         .text('PAYMENT DETAILS', 50, yPos);
      
      yPos += 25;

      doc.rect(50, yPos, 495, 60).fill('#f0fdf4');
      
      doc.fontSize(11)
         .fillColor(gray)
         .font('Helvetica')
         .text('Total Amount Paid', 70, yPos + 15);
      
      doc.fontSize(24)
         .fillColor(green)
         .font('Helvetica-Bold')
         .text(`${booking.currency} ${parseFloat(booking.total_price).toLocaleString()}`, 70, yPos + 32);

      doc.fontSize(10)
         .fillColor(gray)
         .font('Helvetica')
         .text(`Booking Date: ${formatDate(booking.created_at)}`, 350, yPos + 20);
      doc.text(`Status: ${booking.status?.toUpperCase() || 'CONFIRMED'}`, 350, yPos + 35);

      yPos += 80;

      // ================== IMPORTANT INFO ==================
      doc.fontSize(14)
         .fillColor(darkBlue)
         .font('Helvetica-Bold')
         .text('IMPORTANT INFORMATION', 50, yPos);
      
      yPos += 20;

      const importantInfo = [
        'Please arrive at the airport at least 2 hours before departure for domestic flights',
        'For international flights, arrive at least 3 hours before departure',
        'Carry a valid government-issued photo ID',
        'Web check-in opens 48 hours before departure',
        'This e-ticket is valid only for the passenger(s) named above'
      ];

      doc.fontSize(10)
         .fillColor(gray)
         .font('Helvetica');

      importantInfo.forEach((info, i) => {
        doc.text(`• ${info}`, 60, yPos + (i * 15), { width: 480 });
      });

      yPos += importantInfo.length * 15 + 30;

      // ================== FOOTER ==================
      // Footer line
      doc.strokeColor('#e5e7eb')
         .lineWidth(1)
         .moveTo(50, yPos)
         .lineTo(545, yPos)
         .stroke();

      yPos += 15;

      doc.fontSize(9)
         .fillColor(gray)
         .font('Helvetica')
         .text('This is an electronically generated document and does not require a signature.', 50, yPos, { align: 'center', width: 495 });

      doc.text('© 2026 SkyWings. All rights reserved. | support@skywings.com', 50, yPos + 15, { align: 'center', width: 495 });

      // Barcode placeholder (would use a real barcode library in production)
      doc.rect(200, yPos + 35, 195, 40).lineWidth(1).stroke('#e5e7eb');
      doc.fontSize(8)
         .fillColor(gray)
         .text(booking.booking_reference, 200, yPos + 80, { align: 'center', width: 195 });

      // Finalize PDF
      doc.end();

    } catch (error) {
      logger.error('[Ticket] PDF generation failed:', error.message);
      reject(error);
    }
  });
};

module.exports = {
  generateTicketPDF
};
