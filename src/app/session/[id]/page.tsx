'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { getPusherClient } from '@/lib/pusher-client';
import { VOTING_SCALES, SCALE_ORDER, type VotingScale } from '@/types/poker';
import type { Channel } from 'pusher-js';

// Bell icon component
function BellIcon({ className }: { className?: string }) {
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

// Exit/Leave icon component (door with arrow)
function ExitIcon({ className }: { className?: string }) {
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

// Copy icon component (two squares)
function CopyIcon({ className }: { className?: string }) {
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

// Sheep icon component
function SheepIcon({ className, variant = 'dark' }: { className?: string; variant?: 'dark' | 'light' | 'purple' }) {
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

// Participant card component - Stripe style
function ParticipantCard({
  participant,
  isMe,
  revealed,
  onAvatarClick,
  isOnline = true
}: {
  participant: Participant;
  isMe: boolean;
  revealed: boolean;
  onAvatarClick?: () => void;
  isOnline?: boolean;
}) {
  const hasVoted = participant.vote !== null;
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
          <svg xmlns="http://www.w3.org/2000/svg" className={`w-3 h-3 ${hasVoted ? 'text-white' : 'text-white'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
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

type ParticipantRole = 'voter' | 'observer';

// Avatar list in alphabetical order
const AVATARS = [
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

type AvatarType = typeof AVATARS[number];

function getRandomAvatar(): AvatarType {
  return AVATARS[Math.floor(Math.random() * AVATARS.length)];
}

function getNextAvatar(current: string): AvatarType {
  const currentIndex = AVATARS.indexOf(current as AvatarType);
  if (currentIndex === -1) return AVATARS[0];
  return AVATARS[(currentIndex + 1) % AVATARS.length];
}

interface Participant {
  id: string;
  name: string;
  role: ParticipantRole;
  vote: string | null;
  avatar: string;
  lastHeartbeat?: string;
}

// Heartbeat interval in ms (10 seconds)
const HEARTBEAT_INTERVAL = 10000;
// Offline threshold in ms (30 seconds)
const OFFLINE_THRESHOLD = 30000;

function isParticipantOnline(participant: Participant): boolean {
  if (!participant.lastHeartbeat) return false;
  const lastHeartbeat = new Date(participant.lastHeartbeat).getTime();
  const now = Date.now();
  return now - lastHeartbeat < OFFLINE_THRESHOLD;
}

interface SessionState {
  id: string;
  name: string;
  participants: Participant[];
  revealed: boolean;
  story?: string;
  storyLocked?: boolean;
}

interface StoredParticipant {
  name: string;
  role: ParticipantRole;
  participantId: string;
  avatar: string;
}

interface HistoryEntry {
  id: string;
  story: string;
  vote: string;
  timestamp: number;
}

function getStorageKey(sessionId: string) {
  return `poker-session-${sessionId}`;
}

function getStoredParticipant(sessionId: string): StoredParticipant | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(getStorageKey(sessionId));
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

function storeParticipant(sessionId: string, participant: StoredParticipant) {
  localStorage.setItem(getStorageKey(sessionId), JSON.stringify(participant));
}

export default function SessionPage() {
  const params = useParams();
  const sessionId = params.id as string;

  const [session, setSession] = useState<SessionState | null>(null);
  const [participantName, setParticipantName] = useState('');
  const [selectedRole, setSelectedRole] = useState<ParticipantRole>('voter');
  const [joined, setJoined] = useState(false);
  const [myId, setMyId] = useState<string | null>(null);
  const [myRole, setMyRole] = useState<ParticipantRole>('voter');
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const [story, setStory] = useState('');
  const [storyLocked, setStoryLocked] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [customVote, setCustomVote] = useState('');
  const [votingScale, setVotingScale] = useState<VotingScale>('fibonacci');
  const [linkCopied, setLinkCopied] = useState(false);
  const [myAvatar, setMyAvatar] = useState<string>('');
  const channelRef = useRef<Channel | null>(null);
  const hasAttemptedRejoin = useRef(false);
  const myIdRef = useRef<string | null>(null);
  const bellAudioRef = useRef<HTMLAudioElement | null>(null);
  const participantNameRef = useRef<string | null>(null);
  const myAvatarRef = useRef<string>('');
  const storyRef = useRef<string>('');
  const lastAutoSavedStoryRef = useRef<string>('');

  // Keep storyRef in sync with story state
  useEffect(() => {
    storyRef.current = story;
  }, [story]);

  useEffect(() => {
    const pusher = getPusherClient();
    const channel = pusher.subscribe(`session-${sessionId}`);
    channelRef.current = channel;

    channel.bind('session-state', (state: SessionState) => {
      setSession(prev => {
        // Auto-save to history on consensus if story name is entered
        if (state.revealed && !prev?.revealed) {
          const consensusVote = getConsensusVote(state.participants);
          const currentStory = storyRef.current.trim();
          if (consensusVote && currentStory && currentStory !== lastAutoSavedStoryRef.current) {
            lastAutoSavedStoryRef.current = currentStory;
            const entry: HistoryEntry = {
              id: crypto.randomUUID(),
              story: currentStory,
              vote: consensusVote,
              timestamp: Date.now(),
            };
            setHistory(h => {
              const newHistory = [...h, entry];
              // Keep only the last 8 items to prevent overflow
              if (newHistory.length > 8) {
                return newHistory.slice(-8);
              }
              return newHistory;
            });
            setStory('');
            setStoryLocked(false);
            setCustomVote('');
            // Clear story on server
            fetch(`/api/sessions/${sessionId}/story`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ story: '', storyLocked: false }),
            }).catch(console.error);
          }
        }
        return state;
      });
      // Sync selectedCard from session state if we have an ID
      if (myIdRef.current) {
        const me = state.participants.find(p => p.id === myIdRef.current);
        if (me) {
          setSelectedCard(me.vote);
        }
      }
      // Sync story from session state only when it's locked (set)
      // This prevents overwriting a user's in-progress edits
      if (state.storyLocked !== undefined) {
        setStoryLocked(state.storyLocked);
        // Only sync the story value when it's been set (locked) or cleared
        if (state.storyLocked || state.story === '') {
          setStory(state.story ?? '');
          storyRef.current = state.story ?? '';
        }
      }
    });

    channel.bind('bell', (data: { from: string; timestamp: number }) => {
      // Don't play bell for the person who rang it
      if (data.from === participantNameRef.current) return;

      // Play bell sound
      if (bellAudioRef.current) {
        bellAudioRef.current.currentTime = 0;
        bellAudioRef.current.play().catch(() => {
          // Ignore autoplay errors
        });
      }

      // Trigger shake animation
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
    });

    // Fetch session info for the join screen
    fetch(`/api/sessions?id=${sessionId}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && !session) {
          setSession(data);
        }
      })
      .catch(() => {
        // Ignore errors - session might not exist yet
      });

    // Try to rejoin with stored participant info
    if (!hasAttemptedRejoin.current) {
      hasAttemptedRejoin.current = true;
      const stored = getStoredParticipant(sessionId);
      if (stored) {
        // Use stored avatar or generate a random one if not present
        const avatar = stored.avatar || getRandomAvatar();
        fetch(`/api/sessions/${sessionId}/join`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            participantId: stored.participantId,
            name: stored.name,
            role: stored.role,
            avatar,
          }),
        })
          .then(res => res.json())
          .then((state: SessionState) => {
            setSession(state);
            setMyId(stored.participantId);
            myIdRef.current = stored.participantId;
            participantNameRef.current = stored.name;
            setMyRole(stored.role);
            setJoined(true);
            // Restore vote highlight and avatar
            const me = state.participants.find(p => p.id === stored.participantId);
            if (me) {
              if (me.vote) {
                setSelectedCard(me.vote);
              }
              setMyAvatar(me.avatar || avatar);
              myAvatarRef.current = me.avatar || avatar;
            }
          })
          .catch(err => {
            console.error('Failed to rejoin:', err);
          });
      }
    }

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(`session-${sessionId}`);
    };
  }, [sessionId]);

  // Send heartbeat every 10 seconds when joined
  useEffect(() => {
    if (!joined || !myId) return;

    const sendHeartbeat = () => {
      // Check ref to ensure we haven't left the session
      if (!myIdRef.current) return;

      fetch(`/api/sessions/${sessionId}/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId: myIdRef.current }),
      }).catch(console.error);
    };

    // Send initial heartbeat
    sendHeartbeat();

    const interval = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);

    return () => clearInterval(interval);
  }, [sessionId, joined, myId]);

  const joinSession = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!participantName.trim()) return;

    const participantId = crypto.randomUUID();
    const avatar = getRandomAvatar();

    try {
      const res = await fetch(`/api/sessions/${sessionId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantId,
          name: participantName.trim(),
          role: selectedRole,
          avatar,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to join session');
      }

      // Store participant info in localStorage
      storeParticipant(sessionId, {
        name: participantName.trim(),
        role: selectedRole,
        participantId,
        avatar,
      });

      setMyId(participantId);
      myIdRef.current = participantId;
      participantNameRef.current = participantName.trim();
      setMyAvatar(avatar);
      myAvatarRef.current = avatar;
      setMyRole(selectedRole);
      setJoined(true);
    } catch (err) {
      setError('Failed to join session');
      console.error(err);
    }
  }, [sessionId, participantName, selectedRole]);

  const vote = useCallback(async (value: string) => {
    if (!joined || !myId) return;

    // Toggle vote off if clicking the same card
    const newValue = selectedCard === value ? null : value;
    setSelectedCard(newValue);

    // Optimistic update: immediately update the local session state
    setSession(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        participants: prev.participants.map(p =>
          p.id === myId ? { ...p, vote: newValue } : p
        ),
      };
    });

    try {
      await fetch(`/api/sessions/${sessionId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId: myId, vote: newValue }),
      });
    } catch (err) {
      console.error('Failed to vote:', err);
    }
  }, [sessionId, joined, myId, selectedCard]);

  const revealVotes = useCallback(async () => {
    try {
      await fetch(`/api/sessions/${sessionId}/reveal`, {
        method: 'POST',
      });
    } catch (err) {
      console.error('Failed to reveal:', err);
    }
  }, [sessionId]);

  const resetVotes = useCallback(async () => {
    setSelectedCard(null);
    setStory('');
    setStoryLocked(false);
    setCustomVote('');
    try {
      await fetch(`/api/sessions/${sessionId}/reset`, {
        method: 'POST',
      });
    } catch (err) {
      console.error('Failed to reset:', err);
    }
  }, [sessionId]);

  const copyLink = useCallback(() => {
    navigator.clipboard.writeText(window.location.href);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  }, []);

  const ringBell = useCallback(async () => {
    if (!participantNameRef.current) return;

    // Play bell sound and shake for the person who clicked
    if (bellAudioRef.current) {
      bellAudioRef.current.currentTime = 0;
      bellAudioRef.current.play().catch(() => {
        // Ignore autoplay errors
      });
    }
    // Reset and trigger shake animation
    setIsShaking(false);
    requestAnimationFrame(() => {
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 600);
    });

    try {
      await fetch(`/api/sessions/${sessionId}/bell`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantName: participantNameRef.current }),
      });
    } catch (err) {
      console.error('Failed to ring bell:', err);
    }
  }, [sessionId]);

  const leaveSession = useCallback(async () => {
    const participantIdToRemove = myId;

    // Clear state immediately to stop heartbeat and prevent race conditions
    setJoined(false);
    setMyId(null);
    myIdRef.current = null;
    participantNameRef.current = null;
    setMyRole('voter');
    setSelectedCard(null);
    setParticipantName('');
    setMyAvatar('');
    myAvatarRef.current = '';

    // Clear stored participant info
    localStorage.removeItem(getStorageKey(sessionId));

    // Remove participant from session on server
    if (participantIdToRemove) {
      try {
        await fetch(`/api/sessions/${sessionId}/leave`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ participantId: participantIdToRemove }),
        });
      } catch (err) {
        console.error('Failed to leave session:', err);
      }
    }
  }, [sessionId, myId]);

  const cycleAvatar = useCallback(async () => {
    if (!myId || !myAvatar) return;

    const newAvatar = getNextAvatar(myAvatar);
    setMyAvatar(newAvatar);
    myAvatarRef.current = newAvatar;

    // Update localStorage
    const stored = getStoredParticipant(sessionId);
    if (stored) {
      storeParticipant(sessionId, { ...stored, avatar: newAvatar });
    }

    // Update on server
    try {
      await fetch(`/api/sessions/${sessionId}/avatar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId: myId, avatar: newAvatar }),
      });
    } catch (err) {
      console.error('Failed to update avatar:', err);
    }
  }, [sessionId, myId, myAvatar]);

  const saveToHistory = useCallback((vote: string) => {
    if (!story.trim()) return;

    const entry: HistoryEntry = {
      id: crypto.randomUUID(),
      story: story.trim(),
      vote,
      timestamp: Date.now(),
    };

    setHistory(prev => {
      const newHistory = [...prev, entry];
      // Keep only the last 8 items to prevent overflow
      if (newHistory.length > 8) {
        return newHistory.slice(-8);
      }
      return newHistory;
    });
    setStory('');
    setStoryLocked(false);
    setCustomVote('');
    // Clear story on server
    fetch(`/api/sessions/${sessionId}/story`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ story: '', storyLocked: false }),
    }).catch(console.error);
    resetVotes();
  }, [story, sessionId, resetVotes]);

  const updateStoryOnServer = useCallback((newStory: string, locked: boolean) => {
    fetch(`/api/sessions/${sessionId}/story`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ story: newStory, storyLocked: locked }),
    }).catch(console.error);
  }, [sessionId]);

  if (!joined) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: '#f6f9fc' }}>
        <div className="max-w-sm w-full">
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-xl font-semibold text-[#1a1f36] mb-1">
              Planning Poker
            </h1>
            {session?.name && (
              <p className="text-sm text-[#697386]">{session.name}</p>
            )}
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="bg-white rounded-lg border border-[#e3e8ee] p-6" style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.04)' }}>
            <form onSubmit={joinSession} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-[#3c4257] mb-1.5">
                  Your name
                </label>
                <input
                  type="text"
                  id="name"
                  value={participantName}
                  onChange={(e) => setParticipantName(e.target.value)}
                  placeholder="Enter your name"
                  className="input"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#3c4257] mb-2">
                  Role
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label
                    className={`relative flex flex-col items-center p-3 rounded-md cursor-pointer transition-all border ${
                      selectedRole === 'voter'
                        ? 'border-[#635bff] bg-[#f5f8ff]'
                        : 'border-[#e3e8ee] hover:border-[#c1c9d2]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value="voter"
                      checked={selectedRole === 'voter'}
                      onChange={() => setSelectedRole('voter')}
                      className="sr-only"
                    />
                    <div className={`w-8 h-8 rounded-md flex items-center justify-center mb-1.5 ${
                      selectedRole === 'voter'
                        ? 'bg-[#635bff] text-white'
                        : 'bg-[#f6f9fc] text-[#8792a2]'
                    }`}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <span className={`text-sm font-medium ${
                      selectedRole === 'voter' ? 'text-[#635bff]' : 'text-[#3c4257]'
                    }`}>Voter</span>
                    <span className="text-xs text-[#8792a2]">Can vote</span>
                  </label>

                  <label
                    className={`relative flex flex-col items-center p-3 rounded-md cursor-pointer transition-all border ${
                      selectedRole === 'observer'
                        ? 'border-[#635bff] bg-[#f5f8ff]'
                        : 'border-[#e3e8ee] hover:border-[#c1c9d2]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value="observer"
                      checked={selectedRole === 'observer'}
                      onChange={() => setSelectedRole('observer')}
                      className="sr-only"
                    />
                    <div className={`w-8 h-8 rounded-md flex items-center justify-center mb-1.5 ${
                      selectedRole === 'observer'
                        ? 'bg-[#635bff] text-white'
                        : 'bg-[#f6f9fc] text-[#8792a2]'
                    }`}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </div>
                    <span className={`text-sm font-medium ${
                      selectedRole === 'observer' ? 'text-[#635bff]' : 'text-[#3c4257]'
                    }`}>Observer</span>
                    <span className="text-xs text-[#8792a2]">View only</span>
                  </label>
                </div>
              </div>

              <button
                type="submit"
                disabled={!participantName.trim()}
                className="btn btn-primary w-full mt-2"
              >
                Join Session
              </button>
            </form>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={`min-h-screen ${isShaking ? 'animate-shake' : ''}`} style={{ background: '#f6f9fc' }}>
      {/* Hidden audio element for bell sound */}
      <audio ref={bellAudioRef} src="/bell.mp3" preload="auto" />

      <div className="flex gap-5 max-w-6xl mx-auto p-5">
        {/* Left Sidebar */}
        <div className="w-64 flex-shrink-0 space-y-4">
          {/* History */}
          <div className="bg-white rounded-lg border border-[#e3e8ee] p-4" style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.04)' }}>
            <h2 className="section-label mb-3">History</h2>
            {history.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm text-[#8792a2]">No stories yet</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {(() => {
                  // Find the last occurrence of each vote value
                  const seenVotes = new Set<string>();
                  const lastOfVoteIds = new Set<string>();
                  for (let i = history.length - 1; i >= 0; i--) {
                    const vote = history[i].vote;
                    if (!seenVotes.has(vote)) {
                      seenVotes.add(vote);
                      lastOfVoteIds.add(history[i].id);
                    }
                  }
                  return [...history].reverse().map((entry) => {
                    const isLastOfVote = lastOfVoteIds.has(entry.id);
                    return (
                      <li
                        key={entry.id}
                        className={`flex justify-between items-center p-2.5 bg-[#f6f9fc] rounded-md hover:bg-[#e3e8ee] transition-colors ${isLastOfVote ? 'border-l-2 border-l-[#635bff]' : ''}`}
                      >
                        <span className="text-sm truncate flex-1 mr-2 text-[#3c4257]">{entry.story}</span>
                        <span className="text-sm font-semibold text-[#635bff] bg-[#f5f8ff] px-2 py-0.5 rounded">{entry.vote}</span>
                      </li>
                    );
                  });
                })()}
              </ul>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 space-y-4">
        {/* Header */}
        <div className="bg-white rounded-lg border border-[#e3e8ee] p-4" style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.04)' }}>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-lg font-semibold text-[#1a1f36]">{session?.name || 'Planning Poker'}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-[#8792a2] font-mono">
                  {sessionId.slice(0, 8)}...
                </span>
                {linkCopied ? (
                  <span className="text-xs text-[#30c48d] font-medium">Link copied!</span>
                ) : (
                  <button
                    onClick={copyLink}
                    className="inline-flex items-center text-[#635bff] hover:text-[#5449e0]"
                    title="Copy invite link"
                  >
                    <CopyIcon className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={ringBell}
                className="p-2.5 bg-[#635bff] hover:bg-[#5449e0] text-white rounded-md transition-all"
                style={{ boxShadow: '0 2px 4px rgba(99, 91, 255, 0.3)' }}
                title="Ring bell to get attention"
              >
                <BellIcon className="w-5 h-5" />
              </button>
              <button
                onClick={leaveSession}
                className="p-2.5 bg-[#f6f9fc] hover:bg-[#e3e8ee] text-[#697386] rounded-md transition-all border border-[#e3e8ee]"
                title="Leave session"
              >
                <ExitIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Participants */}
        <div className="bg-white rounded-lg border border-[#e3e8ee] p-4" style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.04)' }}>
          <h3 className="section-label mb-3">Participants</h3>
          <div className="flex flex-wrap gap-3">
            {/* Voters */}
            {session?.participants.filter((p) => p.role === 'voter').map((p: Participant) => (
              <ParticipantCard
                key={p.id}
                participant={p}
                isMe={p.id === myId}
                revealed={session?.revealed ?? false}
                onAvatarClick={p.id === myId ? cycleAvatar : undefined}
                isOnline={isParticipantOnline(p)}
              />
            ))}
            {/* Observers */}
            {session?.participants.filter((p) => p.role === 'observer').map((p: Participant) => {
              const isOnline = isParticipantOnline(p);
              return (
                <div key={p.id} className={`flex flex-col items-center gap-2 ${!isOnline ? 'opacity-50' : ''}`}>
                  <div
                    className={`relative w-16 h-24 rounded-lg bg-[#f6f9fc] border border-[#e3e8ee] ${
                      p.id === myId ? 'ring-2 ring-[#635bff] ring-offset-2 cursor-pointer' : ''
                    }`}
                    style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.04)' }}
                    onClick={p.id === myId ? cycleAvatar : undefined}
                    title={p.id === myId ? 'Click to change avatar' : undefined}
                  >
                    <div className="absolute inset-0 flex items-center justify-center">
                      <img
                        src={`/avatars/${p.avatar || 'chicken'}.png`}
                        alt={p.avatar || 'chicken'}
                        className={`w-12 h-12 object-contain ${!isOnline ? 'grayscale' : ''}`}
                      />
                    </div>
                    {/* Observer eye icon */}
                    <div className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-[#635bff] flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className={`text-xs font-medium truncate max-w-16 ${
                      p.id === myId ? 'text-[#635bff] font-semibold' : 'text-[#3c4257]'
                    }`}>
                      {p.name}
                    </span>
                    {!isOnline && (
                      <span className="text-[10px] text-[#8792a2]">Offline</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Story field */}
        <div className="bg-white rounded-lg border border-[#e3e8ee] p-4" style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.04)' }}>
          <label htmlFor="story" className="section-label block mb-2">
            Story <span className="font-normal lowercase">(optional)</span>
          </label>
          {storyLocked && story.trim() ? (
            <div
              onClick={() => {
                setStoryLocked(false);
                updateStoryOnServer(story, false);
              }}
              className="w-full px-3 py-2 rounded-md bg-[#f5f8ff] border border-[#635bff]/20 cursor-pointer hover:bg-[#e0e7ff] transition-colors"
              title="Click to edit"
            >
              <span className="text-[#1a1f36] font-medium text-sm">{story}</span>
            </div>
          ) : (
            <input
              type="text"
              id="story"
              value={story}
              onChange={(e) => setStory(e.target.value)}
              onBlur={() => {
                if (story.trim()) {
                  setStoryLocked(true);
                  updateStoryOnServer(story.trim(), true);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && story.trim()) {
                  setStoryLocked(true);
                  updateStoryOnServer(story.trim(), true);
                  (e.target as HTMLInputElement).blur();
                }
              }}
              placeholder="Enter story title or ticket number..."
              className="input"
              autoFocus={!storyLocked && story.trim().length > 0}
              autoComplete="off"
            />
          )}
        </div>

        {/* Card Selection / Results - Show results when revealed, voting cards otherwise */}
        {session?.revealed ? (
          // Results Panel (replaces voting cards when revealed)
          (() => {
            const resultType = session ? getResultType(session.participants) : 'none';
            const titlePrefix = resultType === 'consensus' ? 'Consensus'
              : resultType === 'majority' ? 'Majority'
              : resultType === 'joint' ? 'Joint Majority'
              : 'Result';
            return (
              <div className="bg-white rounded-lg border border-[#e3e8ee] p-4" style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.04)' }}>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h2 className="section-label">{titlePrefix}</h2>
                    {story && (
                      <p className="text-xs text-[#697386] mt-0.5 truncate">{story}</p>
                    )}
                  </div>
                </div>
                <VoteSummary
                  participants={session.participants}
                  onSelectVote={saveToHistory}
                  canSelect={!!story.trim()}
                  customVote={customVote}
                  onCustomVoteChange={setCustomVote}
                />
              </div>
            );
          })()
        ) : myRole === 'voter' ? (
          // Voting cards for voters
          <div className="bg-white rounded-lg border border-[#e3e8ee] p-4" style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.04)' }}>
            <div className="flex items-center gap-2 mb-3">
              <h2 className="section-label">Your Vote</h2>
              <span className="text-xs font-medium px-2 py-0.5 rounded bg-[#f6f9fc] text-[#697386] border border-[#e3e8ee]">
                {VOTING_SCALES[votingScale].name}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex flex-wrap gap-2 flex-1">
                {VOTING_SCALES[votingScale].values.map((value) => (
                  <button
                    key={value}
                    onClick={() => vote(value)}
                    disabled={session?.revealed}
                    className={`w-14 h-20 text-lg font-semibold rounded-md border transition-all duration-150 ${
                      selectedCard === value
                        ? 'bg-[#635bff] text-white border-[#635bff]'
                        : 'bg-white border-[#e3e8ee] text-[#1a1f36] hover:border-[#635bff] hover:shadow-sm'
                    } disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-[#e3e8ee] disabled:hover:shadow-none`}
                    style={{ boxShadow: selectedCard === value ? '0 4px 12px rgba(99, 91, 255, 0.3)' : '0 1px 2px rgba(0,0,0,0.04)' }}
                  >
                    {value}
                  </button>
                ))}
              </div>
              {/* Scale selector arrows */}
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => {
                    const currentIndex = SCALE_ORDER.indexOf(votingScale);
                    const prevIndex = (currentIndex - 1 + SCALE_ORDER.length) % SCALE_ORDER.length;
                    setVotingScale(SCALE_ORDER[prevIndex]);
                    setSelectedCard(null);
                  }}
                  className="p-2 rounded-md border border-[#e3e8ee] bg-[#f6f9fc] hover:bg-[#e3e8ee] transition-colors text-[#697386]"
                  title="Previous scale"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                </button>
                <button
                  onClick={() => {
                    const currentIndex = SCALE_ORDER.indexOf(votingScale);
                    const nextIndex = (currentIndex + 1) % SCALE_ORDER.length;
                    setVotingScale(SCALE_ORDER[nextIndex]);
                    setSelectedCard(null);
                  }}
                  className="p-2 rounded-md border border-[#e3e8ee] bg-[#f6f9fc] hover:bg-[#e3e8ee] transition-colors text-[#697386]"
                  title="Next scale"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {/* Observer notice - only show when not revealed */}
        {myRole === 'observer' && !session?.revealed && (
          <div className="bg-[#f5f8ff] rounded-lg p-4 border border-[#e0e7ff]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-md bg-[#635bff] flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-[#1a1f36]">
                  You&apos;re observing this session
                </p>
                <p className="text-xs text-[#697386] mt-0.5">
                  You can reveal votes and start new rounds, but cannot vote.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Controls */}
        <div>
          {session?.revealed ? (
            <button
              onClick={() => {
                if (customVote.trim() && story.trim()) {
                  saveToHistory(customVote.trim());
                } else {
                  resetVotes();
                }
              }}
              className="btn btn-warning w-full py-3.5 text-base"
            >
              <span className="flex items-center justify-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                New Round
              </span>
            </button>
          ) : (
            <button
              onClick={revealVotes}
              disabled={!session?.participants.some(p => p.role === 'voter' && p.vote !== null)}
              className="btn btn-success w-full py-3.5 text-base"
            >
              <span className="flex items-center justify-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Reveal Votes
              </span>
            </button>
          )}
        </div>

        </div>

        {/* Right Sidebar Ads */}
        <div className="w-72 flex-shrink-0 space-y-4">
          <div className="bg-white rounded-lg border border-[#e3e8ee] p-2 sticky top-5" style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.04)' }}>
            <div
              className="w-full h-[250px] bg-[#f6f9fc] rounded border border-dashed border-[#c1c9d2] flex items-center justify-center"
            >
              <span className="text-xs text-[#8792a2]">Ad 250×250</span>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-[#e3e8ee] p-2" style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.04)' }}>
            <div
              className="w-full h-[280px] bg-[#f6f9fc] rounded border border-dashed border-[#c1c9d2] flex items-center justify-center"
            >
              <span className="text-xs text-[#8792a2]">Ad 336×280</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Ad Placeholder */}
      <div className="max-w-6xl mx-auto px-5 pb-5">
        <div className="bg-white rounded-lg border border-[#e3e8ee] p-2" style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.04)' }}>
          <div
            className="w-full h-[90px] bg-[#f6f9fc] rounded border border-dashed border-[#c1c9d2] flex items-center justify-center"
          >
            <span className="text-xs text-[#8792a2]">Ad 728×90</span>
          </div>
        </div>
      </div>
    </main>
  );
}

function getConsensusVote(participants: Participant[]): string | null {
  const allVotes = participants
    .filter((p) => p.role === 'voter')
    .map((p) => p.vote)
    .filter((v): v is string => v !== null);

  if (allVotes.length < 2) return null;

  // Check if all votes are the same
  const firstVote = allVotes[0];
  if (allVotes.every(v => v === firstVote)) {
    return firstVote;
  }
  return null;
}

function getResultType(participants: Participant[]): 'consensus' | 'majority' | 'joint' | 'none' {
  const allVotes = participants
    .filter((p) => p.role === 'voter')
    .map((p) => p.vote)
    .filter((v): v is string => v !== null);

  if (allVotes.length === 0) return 'none';

  const voteCounts = allVotes.reduce((acc, vote) => {
    acc[vote] = (acc[vote] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const maxCount = Math.max(...Object.values(voteCounts));
  const majorityVotes = Object.entries(voteCounts)
    .filter(([, count]) => count === maxCount)
    .map(([vote]) => vote);

  // Consensus: all votes are the same
  if (allVotes.length > 1 && majorityVotes.length === 1 && maxCount === allVotes.length) {
    return 'consensus';
  }

  // Joint majority: multiple values tied for the most votes
  if (majorityVotes.length > 1) {
    return 'joint';
  }

  // Single majority
  return 'majority';
}

function VoteSummary({ participants, onSelectVote, canSelect, customVote, onCustomVoteChange }: { participants: Participant[]; onSelectVote?: (vote: string) => void; canSelect?: boolean; customVote?: string; onCustomVoteChange?: (value: string) => void }) {
  // Only count votes from voters
  const allVotes = participants
    .filter((p) => p.role === 'voter')
    .map((p) => p.vote)
    .filter((v): v is string => v !== null);

  if (allVotes.length === 0) {
    return <p className="text-[#8792a2]">No votes cast</p>;
  }

  const numericVotes = allVotes
    .filter((v) => !isNaN(Number(v)))
    .map(Number);

  // Check if we have numeric votes for statistics
  const hasNumericVotes = numericVotes.length > 0;

  // Count occurrences of each vote
  const voteCounts = allVotes.reduce((acc, vote) => {
    acc[vote] = (acc[vote] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Find the maximum count
  const maxCount = Math.max(...Object.values(voteCounts), 0);

  // Find all votes with the maximum count (majority or joint majority)
  const majorityVotes = Object.entries(voteCounts)
    .filter(([, count]) => count === maxCount)
    .map(([vote]) => vote);

  // Check if there's consensus (all votes are the same)
  const hasConsensus = allVotes.length > 1 && majorityVotes.length === 1 && maxCount === allVotes.length;

  const average = hasNumericVotes ? numericVotes.reduce((a, b) => a + b, 0) / numericVotes.length : 0;
  const min = hasNumericVotes ? Math.min(...numericVotes) : 0;
  const max = hasNumericVotes ? Math.max(...numericVotes) : 0;

  return (
    <div className="space-y-4">
      {/* Only show Average/Min/Max for numeric scales */}
      {hasNumericVotes && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[#f6f9fc] rounded-md p-3 text-center border border-[#e3e8ee]">
            <div className="text-2xl font-semibold text-[#1a1f36]">
              {average.toFixed(1)}
            </div>
            <div className="text-xs text-[#697386] mt-0.5">Average</div>
          </div>
          <div className="bg-[#f6f9fc] rounded-md p-3 text-center border border-[#e3e8ee]">
            <div className="text-2xl font-semibold text-[#1a1f36]">
              {min}
            </div>
            <div className="text-xs text-[#697386] mt-0.5">Min</div>
          </div>
          <div className="bg-[#f6f9fc] rounded-md p-3 text-center border border-[#e3e8ee]">
            <div className="text-2xl font-semibold text-[#1a1f36]">
              {max}
            </div>
            <div className="text-xs text-[#697386] mt-0.5">Max</div>
          </div>
        </div>
      )}
      {hasConsensus ? (
        <div className={`text-center ${hasNumericVotes ? 'pt-4 border-t border-[#e3e8ee]' : ''}`}>
          <div
            className={`text-2xl font-semibold text-[#30c48d] ${canSelect ? 'cursor-pointer bg-[#ecfdf5] border border-[#30c48d]/30 hover:bg-[#d1fae5] rounded-md px-5 py-3 transition-all inline-block' : ''}`}
            style={canSelect ? { boxShadow: '0 2px 4px rgba(48, 196, 141, 0.15)' } : {}}
            onClick={() => canSelect && onSelectVote?.((customVote || majorityVotes[0]))}
          >
            Consensus! {majorityVotes[0]}
          </div>
          <div className="text-sm text-[#697386] mt-2">
            {canSelect ? 'Click to save to history' : `Everyone voted ${majorityVotes[0]}`}
          </div>
          {canSelect && (
            <div className="mt-4">
              <input
                type="text"
                maxLength={3}
                value={customVote || ''}
                onChange={(e) => onCustomVoteChange?.(e.target.value)}
                placeholder="?"
                className="w-16 h-12 text-2xl font-semibold text-center border border-[#e3e8ee] rounded-md bg-white text-[#1a1f36] focus:outline-none focus:ring-2 focus:ring-[#635bff]/20 focus:border-[#635bff]"
              />
              <div className="text-xs text-[#8792a2] mt-1.5">Or input value</div>
            </div>
          )}
        </div>
      ) : majorityVotes.length > 0 && (
        <div className={`text-center ${hasNumericVotes ? 'pt-4 border-t border-[#e3e8ee]' : ''}`}>
          <div className="flex justify-center items-center gap-3">
            {majorityVotes.map((vote) => (
              <span
                key={vote}
                className={`text-2xl font-semibold text-[#1a1f36] ${canSelect ? 'cursor-pointer bg-[#f5f8ff] border border-[#635bff]/30 hover:bg-[#e0e7ff] rounded-md px-5 py-3 transition-all' : ''}`}
                style={canSelect ? { boxShadow: '0 2px 4px rgba(99, 91, 255, 0.15)' } : {}}
                onClick={() => canSelect && onSelectVote?.((customVote || vote))}
              >
                {vote}
              </span>
            ))}
          </div>
          <div className="text-sm text-[#697386] mt-2">
            {canSelect ? 'Click a value to save to history' : (
              <>
                {majorityVotes.length === 1 ? 'Majority Vote' : 'Joint Majority'}
                {maxCount > 1 && ` (${maxCount} votes)`}
              </>
            )}
          </div>
          {canSelect && (
            <div className="mt-4">
              <input
                type="text"
                maxLength={3}
                value={customVote || ''}
                onChange={(e) => onCustomVoteChange?.(e.target.value)}
                placeholder="?"
                className="w-16 h-12 text-2xl font-semibold text-center border border-[#e3e8ee] rounded-md bg-white text-[#1a1f36] focus:outline-none focus:ring-2 focus:ring-[#635bff]/20 focus:border-[#635bff]"
              />
              <div className="text-xs text-[#8792a2] mt-1.5">Or input value</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
