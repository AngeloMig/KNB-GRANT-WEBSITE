/**
 * Where every form on the site is delivered (the estimator, the free audit and the project enquiry), through FormSubmit.
 *
 * After FormSubmit is activated, its confirmation email gives you a random alias for this address.
 * Put the alias in FORM_INBOX, so bots looking for FormSubmit forms can't read the address from the page.
 * Replies still go to the person who filled in the form.
 */
// For testing, every form goes to angelobmig@gmail.com only. Switch back to grant.dev14@gmail.com when ready.
export const FORM_INBOX = 'angelobmig@gmail.com';
/** A copy of every form goes here too (empty: no copy). */
export const FORM_CC = '';
export const formEndpoint = (inbox: string) => `https://formsubmit.co/ajax/${inbox}`;

/**
 * The tracker's Inquiries inbox. Every form also posts its lead here, so audits, enquiries and estimates (with the PDF)
 * show up in the tracker. Override with PUBLIC_LEADS_ENDPOINT in .env (e.g. a local tracker while testing).
 */
export const LEADS_ENDPOINT: string = import.meta.env.PUBLIC_LEADS_ENDPOINT || 'https://knb-attendance-tracker.vercel.app/api/leads';
