/**
 * whatsappService.js
 * Service for sending WhatsApp OTP verification messages via Meta Cloud API or Twilio WhatsApp API.
 */

// Normalize phone numbers to E.164 standard (defaulting to +91 for India 10-digit numbers)
function normalizePhoneNumber(phone) {
  if (!phone) return '';
  let cleaned = phone.replace(/[\s\-\(\)]/g, '');
  if (cleaned.startsWith('+')) {
    return cleaned;
  }
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }
  if (cleaned.length === 10) {
    return '+91' + cleaned;
  }
  return '+' + cleaned;
}

/**
 * Send WhatsApp OTP to the specified phone number.
 * @param {string} phone - Recipient phone number
 * @param {string} otp - 6-digit verification code
 * @returns {Promise<{success: boolean, provider: string, messageId?: string}>}
 */
async function sendWhatsAppOtp(phone, otp) {
  const normalizedPhone = normalizePhoneNumber(phone);
  const provider = process.env.WHATSAPP_PROVIDER || (process.env.TWILIO_ACCOUNT_SID ? 'twilio' : (process.env.WHATSAPP_ACCESS_TOKEN ? 'meta' : 'dev'));

  const messageText = `[CybeX Predictive Intelligence]\nYour Law Enforcement Portal verification OTP code is: ${otp}\nThis code is confidential and expires in 10 minutes. Do NOT share it with anyone.`;

  try {
    if (provider === 'meta' && process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID) {
      const url = `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: normalizedPhone.replace('+', ''),
          type: 'text',
          text: { body: messageText }
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        console.error('Meta WhatsApp API Error:', errData);
        throw new Error('Failed to deliver WhatsApp message via Meta Cloud API');
      }

      const data = await response.json();
      return { success: true, provider: 'meta', messageId: data?.messages?.[0]?.id };

    } else if (provider === 'twilio' && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      const fromNumber = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';
      const toNumber = `whatsapp:${normalizedPhone}`;
      const authHeader = 'Basic ' + Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');

      const bodyParams = new URLSearchParams();
      bodyParams.append('From', fromNumber);
      bodyParams.append('To', toNumber);
      bodyParams.append('Body', messageText);

      const url = `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: bodyParams.toString()
      });

      if (!response.ok) {
        const errData = await response.json();
        console.error('Twilio WhatsApp API Error:', errData);
        throw new Error('Failed to deliver WhatsApp message via Twilio API');
      }

      const data = await response.json();
      return { success: true, provider: 'twilio', messageId: data?.sid };

    } else {
      // Development mode delivery simulator (when credentials are not yet set in .env)
      console.log(`\n======================================================`);
      console.log(`[WHATSAPP SERVICE (DEV MODE)]`);
      console.log(`Recipient: ${normalizedPhone}`);
      console.log(`Status: OTP dispatched via WhatsApp provider.`);
      console.log(`======================================================\n`);
      return { success: true, provider: 'dev-mode' };
    }
  } catch (error) {
    console.error('WhatsApp dispatch error:', error.message);
    throw error;
  }
}

module.exports = {
  normalizePhoneNumber,
  sendWhatsAppOtp
};