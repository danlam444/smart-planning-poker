'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { getPusherClient } from '@/lib/pusher-client';
import { CARD_VALUES } from '@/types/poker';
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

// Participant card component - playing card style
function ParticipantCard({
  participant,
  isMe,
  revealed
}: {
  participant: Participant;
  isMe: boolean;
  revealed: boolean;
}) {
  const hasVoted = participant.vote !== null;

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`relative w-20 h-28 rounded-lg border-2 shadow-md transition-all ${
          isMe ? 'ring-2 ring-blue-500 ring-offset-2' : ''
        } ${
          hasVoted
            ? 'bg-zinc-700 border-zinc-600'
            : 'bg-white border-zinc-300'
        }`}
      >
        {/* Inner border */}
        <div
          className={`absolute inset-2 rounded border-2 ${
            hasVoted ? 'border-zinc-500' : 'border-zinc-200'
          }`}
        />

        {/* Card content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {revealed && hasVoted ? (
            <span className="text-2xl font-bold text-white">{participant.vote}</span>
          ) : hasVoted ? (
            <>
              <img src="/sheep-voted.svg" alt="Voted" className="w-14 h-14" />
              <span className="text-[10px] font-bold text-white tracking-wider mt-1">VOTED</span>
            </>
          ) : (
            <img src="/sheep-not-voted.svg" alt="Not voted" className="w-14 h-14" />
          )}
        </div>
      </div>
      <span className={`text-sm font-medium truncate max-w-20 ${isMe ? 'text-blue-600 dark:text-blue-400' : ''}`}>
        {participant.name}
      </span>
    </div>
  );
}

type ParticipantRole = 'estimator' | 'observer';

interface Participant {
  id: string;
  name: string;
  role: ParticipantRole;
  vote: string | null;
}

interface SessionState {
  id: string;
  name: string;
  participants: Participant[];
  revealed: boolean;
}

interface StoredParticipant {
  name: string;
  role: ParticipantRole;
  participantId: string;
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
  const [selectedRole, setSelectedRole] = useState<ParticipantRole>('estimator');
  const [joined, setJoined] = useState(false);
  const [myId, setMyId] = useState<string | null>(null);
  const [myRole, setMyRole] = useState<ParticipantRole>('estimator');
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const channelRef = useRef<Channel | null>(null);
  const hasAttemptedRejoin = useRef(false);
  const myIdRef = useRef<string | null>(null);
  const bellAudioRef = useRef<HTMLAudioElement | null>(null);
  const participantNameRef = useRef<string | null>(null);

  useEffect(() => {
    const pusher = getPusherClient();
    const channel = pusher.subscribe(`session-${sessionId}`);
    channelRef.current = channel;

    channel.bind('session-state', (state: SessionState) => {
      setSession(state);
      // Sync selectedCard from session state if we have an ID
      if (myIdRef.current) {
        const me = state.participants.find(p => p.id === myIdRef.current);
        if (me) {
          setSelectedCard(me.vote);
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

    // Try to rejoin with stored participant info
    if (!hasAttemptedRejoin.current) {
      hasAttemptedRejoin.current = true;
      const stored = getStoredParticipant(sessionId);
      if (stored) {
        fetch(`/api/sessions/${sessionId}/join`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            participantId: stored.participantId,
            name: stored.name,
            role: stored.role,
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
            // Restore vote highlight
            const me = state.participants.find(p => p.id === stored.participantId);
            if (me && me.vote) {
              setSelectedCard(me.vote);
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

  const joinSession = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!participantName.trim()) return;

    const participantId = crypto.randomUUID();

    try {
      const res = await fetch(`/api/sessions/${sessionId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantId,
          name: participantName.trim(),
          role: selectedRole,
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
      });

      setMyId(participantId);
      myIdRef.current = participantId;
      participantNameRef.current = participantName.trim();
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
  }, []);

  const ringBell = useCallback(async () => {
    if (!participantNameRef.current) return;

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

  if (!joined) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-2">Join Planning Poker</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Enter your name to join the session
            </p>
          </div>

          {error && (
            <div className="bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-100 p-4 rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={joinSession} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-2">
                Your Name
              </label>
              <input
                type="text"
                id="name"
                value={participantName}
                onChange={(e) => setParticipantName(e.target.value)}
                placeholder="John Doe"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Join as
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="role"
                    value="estimator"
                    checked={selectedRole === 'estimator'}
                    onChange={() => setSelectedRole('estimator')}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span>Estimator</span>
                  <span className="text-xs text-gray-500">(can vote)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="role"
                    value="observer"
                    checked={selectedRole === 'observer'}
                    onChange={() => setSelectedRole('observer')}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span>Observer</span>
                  <span className="text-xs text-gray-500">(view only)</span>
                </label>
              </div>
            </div>
            <button
              type="submit"
              disabled={!participantName.trim()}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
            >
              Join Session
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className={`min-h-screen p-8 ${isShaking ? 'animate-shake' : ''}`}>
      {/* Hidden audio element for bell sound */}
      <audio ref={bellAudioRef} src="/bell.mp3" preload="auto" />

      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">{session?.name || 'Planning Poker'}</h1>
            <div className="flex items-center gap-2">
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Session ID: {sessionId}
              </p>
              <button
                onClick={copyLink}
                className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                title="Copy invite link"
              >
                <CopyIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
          <button
            onClick={ringBell}
            className="p-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg transition-colors"
            title="Ring bell to get attention"
          >
            <BellIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Participants */}
        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Participants</h2>

          {/* Estimators */}
          {session?.participants.some((p) => p.role === 'estimator') && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Estimators</h3>
              <div className="flex flex-wrap gap-4">
                {session?.participants.filter((p) => p.role === 'estimator').map((p: Participant) => (
                  <ParticipantCard
                    key={p.id}
                    participant={p}
                    isMe={p.id === myId}
                    revealed={session?.revealed ?? false}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Observers */}
          {session?.participants.some((p) => p.role === 'observer') && (
            <div>
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Observers</h3>
              <div className="flex flex-wrap gap-4">
                {session?.participants.filter((p) => p.role === 'observer').map((p: Participant) => (
                  <div key={p.id} className="flex flex-col items-center gap-2">
                    <div
                      className={`relative w-20 h-28 rounded-lg border-2 shadow-md bg-purple-100 border-purple-300 ${
                        p.id === myId ? 'ring-2 ring-purple-500 ring-offset-2' : ''
                      }`}
                    >
                      <div className="absolute inset-2 rounded border-2 border-purple-200" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <img
                          src="/sheep-not-voted.svg"
                          alt="Observer"
                          className="w-14 h-14 hue-rotate-[260deg] saturate-50"
                        />
                      </div>
                    </div>
                    <span className={`text-sm font-medium truncate max-w-20 ${p.id === myId ? 'text-purple-600 dark:text-purple-400' : ''}`}>
                      {p.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Card Selection - Only show for estimators */}
        {myRole === 'estimator' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Your Vote</h2>
            <div className="flex flex-wrap gap-3">
              {CARD_VALUES.map((value) => (
                <button
                  key={value}
                  onClick={() => vote(value)}
                  disabled={session?.revealed}
                  className={`w-16 h-24 text-xl font-bold rounded-lg border-2 transition-all ${
                    selectedCard === value
                      ? 'bg-blue-600 text-white border-blue-600 scale-105'
                      : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:border-blue-500 hover:scale-105'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Observer notice */}
        {myRole === 'observer' && (
          <div className="bg-purple-100 dark:bg-purple-900 rounded-lg p-4 text-center">
            <p className="text-purple-700 dark:text-purple-300">
              You are observing this session. You can reveal votes and start new rounds, but cannot vote.
            </p>
          </div>
        )}

        {/* Controls */}
        <div className="flex gap-4">
          <button
            onClick={revealVotes}
            disabled={session?.revealed}
            className="flex-1 py-3 px-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
          >
            Reveal Votes
          </button>
          <button
            onClick={resetVotes}
            className="flex-1 py-3 px-4 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg transition-colors"
          >
            New Round
          </button>
        </div>

        {/* Results Summary */}
        {session?.revealed && (
          <div className="bg-green-100 dark:bg-green-900 rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-2">Results</h2>
            <VoteSummary participants={session.participants} />
          </div>
        )}
      </div>
    </main>
  );
}

function VoteSummary({ participants }: { participants: Participant[] }) {
  // Only count votes from estimators
  const allVotes = participants
    .filter((p) => p.role === 'estimator')
    .map((p) => p.vote)
    .filter((v): v is string => v !== null);

  const numericVotes = allVotes
    .filter((v) => !isNaN(Number(v)))
    .map(Number);

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

  if (numericVotes.length === 0) {
    return <p className="text-gray-600 dark:text-gray-400">No numeric votes cast</p>;
  }

  const average = numericVotes.reduce((a, b) => a + b, 0) / numericVotes.length;
  const min = Math.min(...numericVotes);
  const max = Math.max(...numericVotes);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-2xl font-bold">{average.toFixed(1)}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Average</div>
        </div>
        <div>
          <div className="text-2xl font-bold">{min}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Min</div>
        </div>
        <div>
          <div className="text-2xl font-bold">{max}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Max</div>
        </div>
      </div>
      {hasConsensus ? (
        <div className="text-center pt-2 border-t border-green-200 dark:border-green-800">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">Consensus!</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Everyone voted {majorityVotes[0]}
          </div>
        </div>
      ) : majorityVotes.length > 0 && (
        <div className="text-center pt-2 border-t border-green-200 dark:border-green-800">
          <div className="text-2xl font-bold">{majorityVotes.join(', ')}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {majorityVotes.length === 1 ? 'Majority Vote' : 'Joint Majority'}
            {maxCount > 1 && ` (${maxCount} votes)`}
          </div>
        </div>
      )}
    </div>
  );
}
