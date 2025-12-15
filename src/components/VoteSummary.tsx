/**
 * VoteSummary - Displays voting results after votes are revealed.
 *
 * FEATURES:
 * - Shows statistics (Average, Min, Max) for numeric votes
 * - Highlights consensus with a green "Consensus!" message
 * - Shows majority/joint majority votes as clickable buttons
 * - Allows entering a custom vote value to save to history
 *
 * WHEN IS IT SHOWN?
 * Only after the "Reveal Votes" button is clicked.
 * Before that, users see the voting cards instead.
 */

import type { Participant } from '@/types/poker';

interface VoteSummaryProps {
  participants: Participant[];           // All participants (we filter to voters only)
  onSelectVote?: (vote: string) => void; // Called when user clicks a vote to save to history
  canSelect?: boolean;                   // Enable clicking votes (requires story name)
  customVote?: string;                   // Custom vote input value
  onCustomVoteChange?: (value: string) => void; // Handler for custom vote input
}

export function VoteSummary({
  participants,
  onSelectVote,
  canSelect,
  customVote,
  onCustomVoteChange
}: VoteSummaryProps) {
  // Step 1: Extract votes from voters only (not observers)
  const allVotes = participants
    .filter((p) => p.role === 'voter')
    .map((p) => p.vote)
    .filter((v): v is string => v !== null);

  if (allVotes.length === 0) {
    return <p className="text-[#8792a2]">No votes cast</p>;
  }

  // Step 2: Separate numeric votes for statistics
  // Filter out non-numeric votes like '?' or '☕'
  const numericVotes = allVotes
    .filter((v) => !isNaN(Number(v)))
    .map(Number);

  // Only show Average/Min/Max if we have numeric votes
  const hasNumericVotes = numericVotes.length > 0;

  // Step 3: Count how many times each vote appears
  // e.g., ['5', '5', '8'] -> { '5': 2, '8': 1 }
  const voteCounts = allVotes.reduce((acc, vote) => {
    acc[vote] = (acc[vote] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Find the highest vote count
  const maxCount = Math.max(...Object.values(voteCounts), 0);

  // Find all votes that have the highest count (could be multiple if tied)
  const majorityVotes = Object.entries(voteCounts)
    .filter(([, count]) => count === maxCount)
    .map(([vote]) => vote);

  // Consensus: everyone voted the same AND there are 2+ votes
  const hasConsensus = allVotes.length > 1 && majorityVotes.length === 1 && maxCount === allVotes.length;

  // Calculate statistics for numeric votes
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
