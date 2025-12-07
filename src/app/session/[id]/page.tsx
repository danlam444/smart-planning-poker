'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { SessionState, Participant, ParticipantRole, CARD_VALUES } from '@/types/poker';

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

  const [socket, setSocket] = useState<Socket | null>(null);
  const [session, setSession] = useState<SessionState | null>(null);
  const [participantName, setParticipantName] = useState('');
  const [selectedRole, setSelectedRole] = useState<ParticipantRole>('estimator');
  const [joined, setJoined] = useState(false);
  const [myId, setMyId] = useState<string | null>(null);
  const [myRole, setMyRole] = useState<ParticipantRole>('estimator');
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const hasAttemptedRejoin = useRef(false);

  useEffect(() => {
    const socketInstance = io({
      path: '/api/socketio',
    });

    socketInstance.on('connect', () => {
      console.log('Connected to socket');

      // Try to rejoin with stored participant info
      if (!hasAttemptedRejoin.current) {
        hasAttemptedRejoin.current = true;
        const stored = getStoredParticipant(sessionId);
        if (stored) {
          socketInstance.emit('rejoin-session', {
            sessionId,
            name: stored.name,
            role: stored.role,
            participantId: stored.participantId,
          });
          setMyId(stored.participantId);
          setMyRole(stored.role);
          setJoined(true);
        }
      }
    });

    socketInstance.on('session-state', (state: SessionState) => {
      setSession(state);
      // Restore selectedCard from session state if we have rejoined
      const stored = getStoredParticipant(sessionId);
      if (stored) {
        const me = state.participants.find(p => p.id === stored.participantId);
        if (me && me.vote) {
          setSelectedCard(me.vote);
        }
      }
    });

    socketInstance.on('error', (msg: string) => {
      setError(msg);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [sessionId]);

  const joinSession = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!socket || !participantName.trim()) return;

    // Generate a unique participant ID that persists across reconnections
    const participantId = crypto.randomUUID();

    socket.emit('join-session', {
      sessionId,
      name: participantName.trim(),
      role: selectedRole,
      participantId,
    });

    // Store participant info in localStorage
    storeParticipant(sessionId, {
      name: participantName.trim(),
      role: selectedRole,
      participantId,
    });

    setMyId(participantId);
    setMyRole(selectedRole);
    setJoined(true);
  }, [socket, sessionId, participantName, selectedRole]);

  const vote = useCallback((value: string) => {
    if (!socket || !joined) return;
    setSelectedCard(value);
    socket.emit('vote', { sessionId, vote: value });
  }, [socket, sessionId, joined]);

  const revealVotes = useCallback(() => {
    if (!socket) return;
    socket.emit('reveal', { sessionId });
  }, [socket, sessionId]);

  const resetVotes = useCallback(() => {
    if (!socket) return;
    setSelectedCard(null);
    socket.emit('reset', { sessionId });
  }, [socket, sessionId]);

  const copyLink = useCallback(() => {
    navigator.clipboard.writeText(window.location.href);
  }, []);

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
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">{session?.name || 'Planning Poker'}</h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Session ID: {sessionId}
            </p>
          </div>
          <button
            onClick={copyLink}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors text-sm"
          >
            Copy Invite Link
          </button>
        </div>

        {/* Participants */}
        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Participants</h2>

          {/* Estimators */}
          {session?.participants.some((p) => p.role === 'estimator') && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Estimators</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {session?.participants.filter((p) => p.role === 'estimator').map((p: Participant) => (
                  <div
                    key={p.id}
                    className={`p-4 rounded-lg text-center ${
                      p.id === myId
                        ? 'bg-blue-100 dark:bg-blue-900 border-2 border-blue-500'
                        : 'bg-white dark:bg-gray-700'
                    }`}
                  >
                    <div className="font-medium truncate">{p.name}</div>
                    <div className="mt-2 text-2xl">
                      {session?.revealed ? (
                        <span className={p.vote ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}>
                          {p.vote || '-'}
                        </span>
                      ) : (
                        <span className={p.vote ? 'text-green-600' : 'text-gray-400'}>
                          {p.vote ? '✓' : '...'}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Observers */}
          {session?.participants.some((p) => p.role === 'observer') && (
            <div>
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Observers</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {session?.participants.filter((p) => p.role === 'observer').map((p: Participant) => (
                  <div
                    key={p.id}
                    className={`p-4 rounded-lg text-center ${
                      p.id === myId
                        ? 'bg-purple-100 dark:bg-purple-900 border-2 border-purple-500'
                        : 'bg-white dark:bg-gray-700'
                    }`}
                  >
                    <div className="font-medium truncate">{p.name}</div>
                    <div className="mt-1 text-xs text-gray-500">Observer</div>
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
  const votes = participants
    .filter((p) => p.role === 'estimator')
    .map((p) => p.vote)
    .filter((v): v is string => v !== null && !isNaN(Number(v)))
    .map(Number);

  if (votes.length === 0) {
    return <p className="text-gray-600 dark:text-gray-400">No numeric votes cast</p>;
  }

  const average = votes.reduce((a, b) => a + b, 0) / votes.length;
  const min = Math.min(...votes);
  const max = Math.max(...votes);

  return (
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
  );
}
