/**
 * ParticipantCard - Displays a single participant in the poker session.
 *
 * VISUAL STATES:
 * 1. Not voted: White card with avatar
 * 2. Voted (hidden): Purple card with avatar (indicates they've voted)
 * 3. Voted (revealed): Purple card showing their vote value
 * 4. Offline: Grayed out with "Offline" label
 *
 * The current user's card has a purple ring around it and can be clicked
 * to cycle through avatars.
 */

import type { Participant } from '@/types/poker';
import { ClipboardIcon } from '@/components/icons';

interface ParticipantCardProps {
  participant: Participant;     // The participant data to display
  isMe: boolean;                // Is this the current user's card?
  revealed: boolean;            // Are votes currently visible?
  onAvatarClick?: () => void;   // Handler for clicking own card to change avatar
  isOnline?: boolean;           // Is participant currently connected?
}

export function ParticipantCard({
  participant,
  isMe,
  revealed,
  onAvatarClick,
  isOnline = true
}: ParticipantCardProps) {
  const hasVoted = participant.vote !== null;
  // Fallback to 'chicken' if avatar is undefined (shouldn't happen, but defensive)
  const avatarSrc = `/avatars/${participant.avatar || 'chicken'}.png`;

  return (
    <div className={`flex flex-col items-center gap-2 ${!isOnline ? 'opacity-50' : ''}`}>
      <div
        className={`relative w-16 h-24 rounded-lg transition-all duration-200 ${
          isMe ? 'ring-2 ring-[#635bff] ring-offset-2' : ''
        } ${
          hasVoted
            ? 'bg-[#635bff]'
            : 'bg-white border border-[#e3e8ee]'
        } ${isMe ? 'cursor-pointer' : ''}`}
        style={{ boxShadow: hasVoted ? '0 4px 12px rgba(99, 91, 255, 0.3)' : '0 2px 4px rgba(0,0,0,0.04)' }}
        onClick={isMe ? onAvatarClick : undefined}
        title={isMe ? 'Click to change avatar' : undefined}
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {revealed && hasVoted ? (
            <span className={`text-2xl font-semibold text-white ${!isOnline ? 'grayscale' : ''}`}>{participant.vote}</span>
          ) : hasVoted ? (
            <img
              src={avatarSrc}
              alt={participant.avatar}
              className={`w-12 h-12 object-contain opacity-90 ${!isOnline ? 'grayscale' : ''}`}
            />
          ) : (
            <img
              src={avatarSrc}
              alt={participant.avatar}
              className={`w-12 h-12 object-contain ${!isOnline ? 'grayscale' : ''}`}
            />
          )}
        </div>
        {/* Voter clipboard icon */}
        <div className={`absolute bottom-1 right-1 w-5 h-5 rounded-full flex items-center justify-center ${hasVoted ? 'bg-white/30' : 'bg-[#635bff]'}`}>
          <ClipboardIcon className={`w-3 h-3 ${hasVoted ? 'text-white' : 'text-white'}`} />
        </div>
      </div>
      <div className="flex flex-col items-center">
        <span className={`text-xs font-medium truncate max-w-16 ${
          isMe ? 'text-[#635bff] font-semibold' : 'text-[#3c4257]'
        }`}>
          {participant.name}
        </span>
        {!isOnline && (
          <span className="text-[10px] text-[#8792a2]">Offline</span>
        )}
      </div>
    </div>
  );
}
