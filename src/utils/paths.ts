/** Resolve site-local links for both root hosting and GitHub project Pages. */
export function withBase(path = '/') {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return `${base}/${path.replace(/^\//, '')}`;
}
