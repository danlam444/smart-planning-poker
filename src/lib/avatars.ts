/**
 * Avatar utilities for participant profile pictures.
 *
 * Each participant gets an animal avatar to make them visually distinguishable.
 * Avatar images are stored in /public/avatars/{name}.png
 *
 * NOTE: The list is sorted alphabetically to make cycling through avatars predictable.
 */

// "as const" makes this a readonly tuple, enabling TypeScript to infer exact string values
export const AVATARS = [
  'chicken',
  'cow',
  'dog',
  'dragon',
  'panda',
  'pig',
  'rabbit',
  'rat',
  'sheep',
  'snake',
  'tiger',
] as const;

// This creates a union type: 'chicken' | 'cow' | 'dog' | ... etc.
// Using typeof AVATARS[number] ensures the type stays in sync with the array
export type AvatarType = typeof AVATARS[number];

/**
 * Returns a random avatar for new participants.
 * Called when a user first joins a session.
 */
export function getRandomAvatar(): AvatarType {
  return AVATARS[Math.floor(Math.random() * AVATARS.length)];
}

/**
 * Returns the next avatar in the list (cycles back to start at the end).
 * Called when a user clicks their card to change their avatar.
 *
 * @param current - The user's current avatar name
 * @returns The next avatar in alphabetical order
 */
export function getNextAvatar(current: string): AvatarType {
  const currentIndex = AVATARS.indexOf(current as AvatarType);
  // If current avatar not found (shouldn't happen), start from beginning
  if (currentIndex === -1) return AVATARS[0];
  // Use modulo to wrap around: after 'tiger' comes 'chicken'
  return AVATARS[(currentIndex + 1) % AVATARS.length];
}
