export interface VideoReview {
  name: string;
  role: string;
  /** Video file in /public, e.g. "/videos/client-name.mp4". */
  src?: string;
  /** WebVTT captions file in /public; needed for accessibility. */
  captions?: string;
  duration: string;
  canvas: string;
  /** Placeholder entries render in `npm run dev` only, with a generated "talking" clip. */
  placeholder?: boolean;
}

// Add real client videos only, recorded and shared with the client's permission.
// Once a real entry is added, delete the placeholders below.
export const videoReviews: VideoReview[] = [
  { name: "Client name", role: "Role, Company", duration: "0:10", canvas: "lilac", placeholder: true },
  { name: "Client name", role: "Role, Company", duration: "0:10", canvas: "olive", placeholder: true },
  { name: "Client name", role: "Role, Company", duration: "0:10", canvas: "clay", placeholder: true },
];
