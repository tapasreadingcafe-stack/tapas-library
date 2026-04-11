// Shared CORS headers for all edge functions invoked from the tapas-store browser client.
// www.tapasreadingcafe.com is the production origin; localhost:3000 is dev.

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-razorpay-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
