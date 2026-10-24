/**
 * Where every form on the site is delivered (the estimator, the free audit and the project enquiry), through FormSubmit.
 *
 * After FormSubmit is activated, its confirmation email gives you a random alias for this address.
 * Put the alias in FORM_INBOX, so bots looking for FormSubmit forms can't read the address from the page.
 * Replies still go to the person who filled in the form.
 */
export const FORM_INBOX = 'grant.dev14@gmail.com';
/** A copy of every form goes here too. */
export const FORM_CC = 'angelobmig@gmail.com';
export const formEndpoint = (inbox: string) => `https://formsubmit.co/ajax/${inbox}`;
