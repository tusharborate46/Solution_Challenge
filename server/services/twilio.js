// Stub wrapper for Twilio SMS integration

exports.sendSMSFallback = async (phoneNumber, message) => {
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    // Implement actual Twilio SDK call here
    console.log(`[Twilio SDK] Sending SMS to ${phoneNumber}: ${message}`);
  } else {
    console.log(`[Twilio STUB] Would have sent SMS to ${phoneNumber}: ${message}`);
  }
};
