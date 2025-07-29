# Alarrache WebSocket Server

Serveur WebSocket pour les commentaires et la présence en temps réel de l'application Alarrache.

## 🚀 Déploiement sur Coolify

### Configuration requise

- **Port** : 6001
- **Variables d'environnement** :
  - `WEBSOCKET_PORT` : Port du serveur (défaut: 6001)
  - `CORS_ORIGIN` : Origine autorisée pour CORS (ex: https://votre-domaine.com)

### Étapes de déploiement

1. **Dans Coolify** :
   - Créer un nouveau service
   - Type : Application
   - Source : Git Repository
   - Build Pack : Dockerfile
   - Port : 6001

2. **Variables d'environnement** :
   ```
   WEBSOCKET_PORT=6001
   CORS_ORIGIN=https://votre-domaine.com
   NODE_ENV=production
   ```

3. **Health Check** :
   - Path : `/health`
   - Port : 6001

### Endpoints

- **Health Check** : `GET /health`
- **WebSocket** : `ws://votre-domaine.com:6001`

### Événements WebSocket

- `join-session` : Rejoindre une session
- `typing` : Indicateur de frappe
- `comment-created` : Nouveau commentaire
- `comment-updated` : Commentaire modifié
- `comment-deleted` : Commentaire supprimé
- `laravel-broadcast` : Événements Laravel

## 🔧 Développement local

```bash
# Installer les dépendances
npm install

# Démarrer en mode développement
npm run dev

# Démarrer en mode production
npm start
```

## 🐳 Docker

```bash
# Construire l'image
docker build -t alarrache-websocket .

# Démarrer avec docker-compose
docker-compose up -d
``` 
