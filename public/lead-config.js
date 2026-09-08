// Lead submission endpoint for the static (non-Node.js) deployment.
//
// Leave this empty until a real destination exists (e.g. a Make.com
// scenario webhook). While empty, the lead forms show an honest
// "not connected yet" message instead of a fake success — they never
// silently pretend to have received a lead.
//
// To activate: paste the webhook URL between the quotes below and
// re-upload just this one file — no rebuild, no Node.js needed.
//
//   window.LEAD_SUBMIT_URL = "https://hook.eu1.make.com/xxxxxxxxxxxx";
//
window.LEAD_SUBMIT_URL = "";
