// The hero orbit's depth ladder: the front card is the biggest, the two beside it smaller, the ones
// behind smaller still (idea 1 of /ideas/orbit-depth/). Shared by the CSS orbit (HomeHero.astro) and the
// phones' 3D model (orbit-phone-scene.ts), so both size their cards the same way.

/** Sizes one step apart round the ring: [front, beside it, next, at the back]. */
export const DEPTH_STEPS = [1.25, 0.72, 0.5, 0.36] as const;
export const FRONT_SCALE = DEPTH_STEPS[0];

/** A card's size from its angle away from the front (degrees, -180 to 180), eased between the steps. */
export function depthScale(angle: number, stepAngle = 60): number {
  const k = Math.min(3, Math.abs(angle) / stepAngle);
  const i = Math.min(2, Math.floor(k)), t = k - i;
  const ease = t * t * (3 - 2 * t);
  return DEPTH_STEPS[i] + (DEPTH_STEPS[i + 1] - DEPTH_STEPS[i]) * ease;
}
