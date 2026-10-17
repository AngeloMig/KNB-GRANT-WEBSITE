export interface VideoReview {
  name: string;
  role: string;
  /** Video file in /public, e.g. "/videos/client-name.mp4". */
  src?: string;
  /** Preview image in /public shown before the video plays, e.g. "/videos/client-name.jpg". */
  poster?: string;
  /** WebVTT captions file in /public; needed for accessibility. */
  captions?: string;
  duration: string;
  canvas: string;
  /** Placeholder entries use a generated, clearly labelled "talking" clip instead of a real video. */
  placeholder?: boolean;
}

/** Show placeholder entries on the published site. Set to false to hide them live while keeping them in `npm run dev`. */
export const showPlaceholdersLive = true;

// Add real client videos only, recorded and shared with the client's permission.
// Once a real entry is added, delete the placeholders below.
export const videoReviews: VideoReview[] = [
  { name: "Client name", role: "Role, Company", duration: "0:10", canvas: "lilac", placeholder: true },
  { name: "Client name", role: "Role, Company", duration: "0:10", canvas: "olive", placeholder: true },
  { name: "Client name", role: "Role, Company", duration: "0:10", canvas: "clay", placeholder: true },
];
