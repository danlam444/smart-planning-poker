const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');
const crypto = require('crypto');
const { SessionManager } = require('./src/lib/sessionManager');

function uuidv4() {
  return crypto.randomUUID();
}

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Configure session expiry (default 7 days) and cleanup interval (default 1 hour)
// Can be overridden via environment variables
const sessionExpiryMs = parseInt(process.env.SESSION_EXPIRY_MS || String(7 * 24 * 60 * 60 * 1000), 10);
const cleanupIntervalMs = parseInt(process.env.CLEANUP_INTERVAL_MS || String(60 * 60 * 1000), 10);

const sessionManager = new SessionManager({ sessionExpiryMs, cleanupIntervalMs });
sessionManager.startCleanup();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);

    // Handle session creation API
    if (req.method === 'POST' && parsedUrl.pathname === '/api/sessions') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const { name } = JSON.parse(body);
          if (!name) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Session name is required' }));
            return;
          }
          const id = uuidv4();
          sessionManager.createSession(id, name);
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ id, name }));
        } catch (e) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Invalid request' }));
        }
      });
      return;
    }

    handle(req, res, parsedUrl);
  });

  const io = new Server(httpServer, {
    path: '/api/socketio',
    addTrailingSlash: false,
  });

  // Map socket.id to participantId for vote/disconnect handling
  const socketToParticipant = new Map();

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    let currentSessionId = null;
    let currentParticipantId = null;

    socket.on('join-session', ({ sessionId, name, role, participantId }) => {
      // Use provided participantId or generate one
      const pid = participantId || uuidv4();
      sessionManager.addParticipant(sessionId, pid, name, role);
      currentSessionId = sessionId;
      currentParticipantId = pid;
      socketToParticipant.set(socket.id, { sessionId, participantId: pid });
      socket.join(sessionId);
      io.to(sessionId).emit('session-state', sessionManager.getSessionState(sessionId));
    });

    socket.on('rejoin-session', ({ sessionId, name, role, participantId }) => {
      // Check if participant already exists in session
      const existing = sessionManager.getParticipant(sessionId, participantId);
      if (existing) {
        // Participant exists, just rejoin the room
        currentSessionId = sessionId;
        currentParticipantId = participantId;
        socketToParticipant.set(socket.id, { sessionId, participantId });
        socket.join(sessionId);
        io.to(sessionId).emit('session-state', sessionManager.getSessionState(sessionId));
      } else {
        // Participant doesn't exist, add them back
        sessionManager.addParticipant(sessionId, participantId, name, role);
        currentSessionId = sessionId;
        currentParticipantId = participantId;
        socketToParticipant.set(socket.id, { sessionId, participantId });
        socket.join(sessionId);
        io.to(sessionId).emit('session-state', sessionManager.getSessionState(sessionId));
      }
    });

    socket.on('vote', ({ sessionId, vote }) => {
      const mapping = socketToParticipant.get(socket.id);
      if (mapping && sessionManager.vote(sessionId, mapping.participantId, vote)) {
        io.to(sessionId).emit('session-state', sessionManager.getSessionState(sessionId));
      }
    });

    socket.on('reveal', ({ sessionId }) => {
      if (sessionManager.reveal(sessionId)) {
        io.to(sessionId).emit('session-state', sessionManager.getSessionState(sessionId));
      }
    });

    socket.on('reset', ({ sessionId }) => {
      if (sessionManager.reset(sessionId)) {
        io.to(sessionId).emit('session-state', sessionManager.getSessionState(sessionId));
      }
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
      // Don't remove participant on disconnect - they may rejoin
      // Just clean up the socket mapping
      socketToParticipant.delete(socket.id);
    });
  });

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
