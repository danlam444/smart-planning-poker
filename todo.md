# Vote Persistence - Highlight saved vote on rejoin

## Plan
- [x] Write e2e test for vote persistence after rejoin
- [x] On session-state received, find my vote from participants and set selectedCard
- [x] Run tests and verify pass

## Review
Added vote persistence on rejoin. When the session-state event is received, the client now looks up the stored participant ID and finds their vote in the participants list. If a vote exists, it sets `selectedCard` to restore the highlighted state of the voted card.

Changed file: `src/app/session/[id]/page.tsx` - Added 7 lines in the session-state handler to restore selectedCard from the participant's vote in session state.
