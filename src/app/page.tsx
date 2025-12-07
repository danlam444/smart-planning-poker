'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [sessionName, setSessionName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const router = useRouter();

  const createSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionName.trim()) return;

    setIsCreating(true);
    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: sessionName }),
      });

      if (response.ok) {
        const { id } = await response.json();
        router.push(`/session/${id}`);
      }
    } catch (error) {
      console.error('Failed to create session:', error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-2">Planning Poker</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Create a session and invite your team to estimate stories together
          </p>
        </div>

        <form onSubmit={createSession} className="space-y-4">
          <div>
            <label htmlFor="sessionName" className="block text-sm font-medium mb-2">
              Session Name
            </label>
            <input
              type="text"
              id="sessionName"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              placeholder="Sprint 42 Planning"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800"
              required
            />
          </div>
          <button
            type="submit"
            disabled={isCreating || !sessionName.trim()}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
          >
            {isCreating ? 'Creating...' : 'Create Session'}
          </button>
        </form>
      </div>
    </main>
  );
}
