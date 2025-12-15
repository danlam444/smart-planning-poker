/**
 * Icon components for the Planning Poker UI.
 *
 * WHY SVG COMPONENTS?
 * - Inline SVGs can be styled with CSS (color, size)
 * - No extra HTTP requests for icon files
 * - Tree-shakeable (unused icons don't increase bundle size)
 *
 * STYLING CONVENTION:
 * All icons accept a className prop and use currentColor for fill/stroke.
 * This means the icon inherits its color from the parent's text color.
 *
 * Example: <BellIcon className="w-5 h-5 text-blue-500" />
 */

/**
 * Bell icon - Used for the "ring bell" notification feature.
 * Clicking this alerts all participants in the session.
 */
export function BellIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path
        fillRule="evenodd"
        d="M5.25 9a6.75 6.75 0 0113.5 0v.75c0 2.123.8 4.057 2.118 5.52a.75.75 0 01-.297 1.206c-1.544.57-3.16.99-4.831 1.243a3.75 3.75 0 11-7.48 0 24.585 24.585 0 01-4.831-1.244.75.75 0 01-.298-1.205A8.217 8.217 0 005.25 9.75V9zm4.502 8.9a2.25 2.25 0 104.496 0 25.057 25.057 0 01-4.496 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}

/**
 * Exit/door icon - Used for the "Leave Session" button.
 */
export function ExitIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className={className}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  );
}

/**
 * Copy icon - Used for the "Copy invite link" button.
 */
export function CopyIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className={className}
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </svg>
  );
}

/**
 * Sheep icon - Custom mascot icon with color variants.
 * Used in branding/decorative contexts.
 *
 * Variants:
 * - 'dark': Dark gray sheep (default)
 * - 'light': White sheep with dark features
 * - 'purple': Purple sheep (brand color)
 */
export function SheepIcon({ className, variant = 'dark' }: { className?: string; variant?: 'dark' | 'light' | 'purple' }) {
  const colors = {
    dark: { fill: '#3f3f46', face: '#fafafa', eyes: '#fafafa' },
    light: { fill: '#fafafa', face: '#3f3f46', eyes: '#3f3f46' },
    purple: { fill: '#7c3aed', face: '#fafafa', eyes: '#fafafa' },
  };
  const { fill: fillColor, face: faceColor, eyes: eyeColor } = colors[variant];
  const strokeColor = fillColor;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 80"
      className={className}
    >
      {/* Body - fluffy cloud shape */}
      <ellipse cx="50" cy="45" rx="30" ry="22" fill={fillColor} />
      <circle cx="25" cy="42" r="12" fill={fillColor} />
      <circle cx="75" cy="42" r="12" fill={fillColor} />
      <circle cx="35" cy="30" r="10" fill={fillColor} />
      <circle cx="50" cy="28" r="10" fill={fillColor} />
      <circle cx="65" cy="30" r="10" fill={fillColor} />
      <circle cx="30" cy="55" r="8" fill={fillColor} />
      <circle cx="70" cy="55" r="8" fill={fillColor} />

      {/* Tail */}
      <circle cx="82" cy="45" r="5" fill={fillColor} />

      {/* Legs */}
      <rect x="32" y="58" width="4" height="16" rx="2" fill={strokeColor} />
      <rect x="42" y="58" width="4" height="16" rx="2" fill={strokeColor} />
      <rect x="54" y="58" width="4" height="16" rx="2" fill={strokeColor} />
      <rect x="64" y="58" width="4" height="16" rx="2" fill={strokeColor} />

      {/* Head */}
      <ellipse cx="22" cy="35" rx="12" ry="14" fill={fillColor} />
      <ellipse cx="22" cy="38" rx="8" ry="9" fill={faceColor} />

      {/* Ears */}
      <ellipse cx="12" cy="28" rx="5" ry="3" fill={faceColor} />
      <ellipse cx="32" cy="28" rx="5" ry="3" fill={faceColor} />

      {/* Eyes */}
      <circle cx="18" cy="35" r="1.5" fill={eyeColor} />
      <circle cx="26" cy="35" r="1.5" fill={eyeColor} />

      {/* Nose */}
      <ellipse cx="22" cy="42" rx="2" ry="1.5" fill={eyeColor} />
    </svg>
  );
}

/**
 * Clipboard icon - Shown on voter participant cards.
 * Indicates the participant is a voter (not an observer).
 */
export function ClipboardIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  );
}

/**
 * Eye icon - Shown on observer participant cards.
 * Indicates the participant is watching but not voting.
 */
export function EyeIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );
}
