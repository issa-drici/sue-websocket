const { createServer } = require('http');
const { Server } = require('socket.io');

// Configuration
const PORT = process.env.WEBSOCKET_PORT || 6001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:8000';

// Stockage des utilisateurs connectés par session
const sessionUsers = new Map();

// Créer le serveur HTTP
const httpServer = createServer();

// Créer le serveur Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: CORS_ORIGIN,
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket'] // Uniquement WebSocket, pas de polling
});

// Gestion des requêtes HTTP
httpServer.on('request', (req, res) => {
  // Ajouter les headers CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, Content-Type, X-Auth-Token, X-Requested-With, Accept, Authorization, X-CSRF-TOKEN, XSRF-TOKEN, X-Socket-Id');

  // Gérer les requêtes OPTIONS (preflight)
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Routes personnalisées
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      timestamp: new Date().toISOString(),
      connections: io.engine.clientsCount,
      sessions: sessionUsers.size
    }));
  } else if (req.url === '/emit' && req.method === 'POST') {
    // Endpoint pour émettre des événements depuis Laravel
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        const { event, data } = JSON.parse(body);

        if (event && data) {
          // Émettre l'événement à tous les clients connectés
          io.emit(event, data);

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, event, data }));
        } else {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Event and data required' }));
        }
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
  } else if (req.url === '/' || req.url === '') {
    // Route racine
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      message: 'Alarrache WebSocket Server',
      version: '1.0.0',
      status: 'running',
      timestamp: new Date().toISOString()
    }));
  } else if (req.url && req.url.startsWith('/socket.io/')) {
    // Laisser Socket.IO gérer ses propres routes
    // Ne rien faire ici, Socket.IO va automatiquement gérer
    return;
  } else {
    // Route non trouvée
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      error: 'Not Found',
      message: 'Route not found',
      available_routes: ['/health', '/emit', '/socket.io/']
    }));
  }
});

console.log('🚀 Serveur WebSocket démarré sur le port', PORT);
console.log('📡 CORS configuré pour:', CORS_ORIGIN);

// Gestion des connexions
io.on('connection', (socket) => {
  console.log('👤 Nouvelle connexion:', socket.id);

  // Rejoindre une session
  socket.on('join-session', (data) => {
    const { sessionId, userId, user } = data;

    if (!sessionId || !userId) {
      socket.emit('error', { message: 'SessionId et userId requis' });
      return;
    }

    // Rejoindre la room de la session
    socket.join(`sport-session.${sessionId}`);

    // Stocker les informations de l'utilisateur
    socket.sessionId = sessionId;
    socket.userId = userId;
    socket.user = user;

    // Ajouter l'utilisateur à la liste des utilisateurs de la session
    if (!sessionUsers.has(sessionId)) {
      sessionUsers.set(sessionId, new Map());
    }
    sessionUsers.get(sessionId).set(userId, {
      socketId: socket.id,
      user: user,
      joinedAt: new Date()
    });

    console.log(`👥 ${user?.firstname || userId} a rejoint la session ${sessionId}`);

    // Notifier les autres utilisateurs
    socket.to(`sport-session.${sessionId}`).emit('user.online', {
      userId: userId,
      user: user,
      joinedAt: new Date().toISOString()
    });

    // Envoyer la liste des utilisateurs en ligne
    const onlineUsers = Array.from(sessionUsers.get(sessionId).values());
    socket.emit('online-users', onlineUsers);
  });

  // Indicateur de frappe
  socket.on('typing', (data) => {
    const { sessionId, userId, isTyping, user } = data;

    if (socket.sessionId === sessionId) {
      socket.to(`sport-session.${sessionId}`).emit('user.typing', {
        userId: userId,
        user: user,
        isTyping: isTyping,
        timestamp: new Date().toISOString()
      });
    }
  });

      // Nouveau commentaire
    socket.on('comment-created', (data) => {
        const { sessionId, comment } = data;

        if (socket.sessionId === sessionId) {
            socket.to(`sport-session.${sessionId}`).emit('comment.created', {
                comment: comment
            });
        }
    });

    // Commentaire modifié
    socket.on('comment-updated', (data) => {
        const { sessionId, comment } = data;

        if (socket.sessionId === sessionId) {
            socket.to(`sport-session.${sessionId}`).emit('comment.updated', {
                comment: comment
            });
        }
    });

    // Commentaire supprimé
    socket.on('comment-deleted', (data) => {
        const { sessionId, commentId } = data;

        if (socket.sessionId === sessionId) {
            socket.to(`sport-session.${sessionId}`).emit('comment.deleted', {
                commentId: commentId,
                deletedAt: new Date().toISOString()
            });
        }
    });

    // Événements Laravel Broadcasting
    socket.on('laravel-broadcast', (data) => {
        const { event, channel, data: eventData } = data;

        // Émettre l'événement sur le canal approprié
        if (channel && event) {
            socket.to(channel).emit(event, eventData);
            console.log(`📡 Laravel event broadcasted: ${event} on ${channel}`);
        }
    });

  // Déconnexion
  socket.on('disconnect', () => {
    console.log('👋 Déconnexion:', socket.id);

    if (socket.sessionId && socket.userId) {
      const sessionId = socket.sessionId;
      const userId = socket.userId;
      const user = socket.user;

      // Retirer l'utilisateur de la session
      if (sessionUsers.has(sessionId)) {
        sessionUsers.get(sessionId).delete(userId);

        // Si plus d'utilisateurs dans la session, supprimer la session
        if (sessionUsers.get(sessionId).size === 0) {
          sessionUsers.delete(sessionId);
        }
      }

      // Notifier les autres utilisateurs
      socket.to(`sport-session.${sessionId}`).emit('user.offline', {
        userId: userId,
        user: user,
        leftAt: new Date().toISOString()
      });

      console.log(`👋 ${user?.firstname || userId} a quitté la session ${sessionId}`);
    }
  });

  // Ping pour maintenir la connexion
  socket.on('ping', () => {
    socket.emit('pong');
  });
});

// Démarrer le serveur
httpServer.listen(PORT, () => {
  console.log(`🎉 Serveur WebSocket prêt sur le port ${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
});

// Gestion des erreurs
process.on('SIGINT', () => {
  console.log('\n🛑 Arrêt du serveur WebSocket...');
  httpServer.close(() => {
    console.log('✅ Serveur arrêté proprement');
    process.exit(0);
  });
});
