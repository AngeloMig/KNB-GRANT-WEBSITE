export interface VideoReview {
  name: string;
  role: string;
  /** Video file in /public, e.g. "/videos/client-name.mp4". */
  src?: string;
  /** Preview image in /public shown before the video plays, e.g. "/videos/client-name.jpg". */
  poster?: string;
  /** WebVTT captions file in /public; needed for accessibility (skip it when captions are burned into the video). */
  captions?: string;
  /** What the client says, shown under the video ("Read transcript"); use it when captions are burned in. */
  transcript?: string;
  /** A short line from the video, word for word, shown beside it in the carousel. */
  pullQuote?: string;
  duration: string;
  canvas: string;
  /** Placeholder entries use a generated, clearly labelled "talking" clip instead of a real video. */
  placeholder?: boolean;
}

/** A written testimonial, shown as a card next to the videos. */
export interface TextReview {
  name: string;
  role: string;
  quote: string;
  canvas: string;
  /**
   * Only approved testimonials appear on the published site. Use the client's own words, or wording
   * they have read and approved. Unapproved ones show in `npm run dev` only, labelled as a draft.
   */
  approved: boolean;
}

/** Show placeholder entries on the published site. Set to false to hide them live while keeping them in `npm run dev`. */
export const showPlaceholdersLive = true;

// Add real client videos only, recorded and shared with the client's permission.
export const videoReviews: VideoReview[] = [
  {
    name: 'Carlos',
    role: 'CEO & Owner, MDO Digital · formerly Technical Director at Rivyl',
    src: '/videos/carlos-mdo-digital.mp4',
    poster: '/videos/carlos-mdo-digital.jpg',
    duration: '0:55',
    pullQuote: 'He’s just an absolute weapon when it comes to Shopify.',
    transcript: "Yeah, so I've been working with Grant for quite a while now. It's been, I believe, more than four years across a range of different industries, especially around Shopify development. He's just an absolute weapon when it comes to Shopify, especially with some of the more curly questions or situations. He's always got a solution ready to go. And if he doesn't, he always tests solutions and actually lets you know which one's going to be the best for the situation. So yeah, I've worked with him quite extensively at Rivyl, and I'm also employing him now with my own business, MDO. So yeah, Grant's just been a phenomenal worker. Yeah, absolute legend.",
    canvas: 'lilac',
  },
  {
    name: 'Hans',
    // From the video ("I've managed him for some of those years"); he was at Rivyl, like Carlos.
    role: 'Managed Grant at Rivyl · 4 years working together',
    src: '/videos/hans.mp4',
    poster: '/videos/hans.jpg',
    duration: '0:29',
    pullQuote: 'Any company would be fortunate to have him on their team.',
    transcript: "Hi, my name is Hans, and I've worked with Grant for four years, and I've managed him for some of those years as well. Grant is one of the most talented and gifted Shopify developers that I've worked with, and whenever we had a big problem, Grant would always provide a solution for those problems. And any project and any company would be fortunate to have him on their team.",
    canvas: 'olive',
  },
];

export const textReviews: TextReview[] = [
  {
    name: 'John',
    role: 'CEO & Owner, Modern Shelving',
    // Approved by John on 2026-10-24.
    quote: 'Grant made our website faster and much easier for our team to manage. He replied quickly, explained things in plain English and delivered when he said he would. We’d happily work with him again.',
    canvas: 'clay',
    approved: true,
  },
];
