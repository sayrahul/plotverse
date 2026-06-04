/**
 * Project_ID generation and validation (pure, framework-free).
 *
 * A Project_ID is a short, URL-friendly identifier that uniquely names a
 * Project and forms its public path (`/[projectId]`). Ids are 5–6 characters
 * long and drawn from a case-sensitive alphanumeric alphabet.
 *
 * This module is deliberately I/O free: uniqueness is checked through an
 * injected `existing` predicate (typically backed by `projectRepo.exists`),
 * which keeps the generator pure and property-testable while letting the
 * data-access layer own the Firestore lookup.
 *
 * Requirements:
 * - 2.1 — generate a Project_ID of 5 to 6 alphanumeric characters.
 * - 2.3 — ensure a generated Project_ID does not match any existing Project_ID.
 */

/**
 * The case-sensitive alphabet used for Project_IDs: A–Z, a–z, 0–9 (62 chars).
 * Defined exactly as in the design so generation and validation agree.
 */
const ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

/** Inclusive lower bound on Project_ID length (Req 2.1). */
const MIN_LENGTH = 5;
/** Inclusive upper bound on Project_ID length (Req 2.1). */
const MAX_LENGTH = 6;
/** Default number of generation attempts before giving up (Req 2.3). */
const DEFAULT_MAX_ATTEMPTS = 10;

/**
 * Maps a random draw in the nominal range [0, 1) onto an integer index in
 * `[0, size)`.
 *
 * `Math.random()` never returns 1, but an injected `rng` might return values at
 * or beyond the boundary; clamping keeps the index in range so generation can
 * never read past the end of the alphabet or exceed the length bound.
 */
function boundedIndex(draw: number, size: number): number {
  const scaled = Math.floor(draw * size);
  if (scaled < 0) return 0;
  if (scaled >= size) return size - 1;
  return scaled;
}

/**
 * Generates a single candidate Project_ID using `rng` for all randomness
 * (Req 2.1).
 *
 * The candidate's length is either {@link MIN_LENGTH} or {@link MAX_LENGTH}
 * (chosen via the first draw) and every character is selected from
 * {@link ALPHABET}, so the result always satisfies {@link isValidProjectId}.
 *
 * @param rng A function returning a number in [0, 1), e.g. `Math.random`.
 */
export function generateProjectIdCandidate(rng: () => number): string {
  const lengthSpan = MAX_LENGTH - MIN_LENGTH + 1;
  const length = MIN_LENGTH + boundedIndex(rng(), lengthSpan);

  let id = "";
  for (let i = 0; i < length; i++) {
    id += ALPHABET[boundedIndex(rng(), ALPHABET.length)];
  }
  return id;
}

/**
 * True iff `id` is a well-formed Project_ID: between {@link MIN_LENGTH} and
 * {@link MAX_LENGTH} characters long and composed solely of {@link ALPHABET}
 * characters (Req 2.1).
 */
export function isValidProjectId(id: string): boolean {
  if (id.length < MIN_LENGTH || id.length > MAX_LENGTH) return false;
  for (const char of id) {
    if (!ALPHABET.includes(char)) return false;
  }
  return true;
}

/**
 * Generates a Project_ID that is not already in use (Req 2.3).
 *
 * Candidates are generated and tested against `existing` until one is free or
 * the attempt budget is exhausted. Because `existing` returns `true` when an id
 * is *taken*, the first candidate for which it resolves `false` is returned.
 *
 * @param existing Predicate resolving `true` when the id is already taken.
 * @param rng Randomness source; defaults to `Math.random`.
 * @param maxAttempts Maximum candidates to try before failing; defaults to 10.
 * @returns A Project_ID not present according to `existing`.
 * @throws {Error} If no unused id is found within `maxAttempts` attempts.
 */
export async function generateUniqueProjectId(
  existing: (id: string) => Promise<boolean>,
  rng: () => number = Math.random,
  maxAttempts: number = DEFAULT_MAX_ATTEMPTS,
): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const candidate = generateProjectIdCandidate(rng);
    if (!(await existing(candidate))) {
      return candidate;
    }
  }
  throw new Error(
    `Failed to generate a unique Project_ID after ${maxAttempts} attempts`,
  );
}
