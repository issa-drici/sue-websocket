# Utiliser Node.js 18 Alpine pour une image légère
FROM node:18-alpine

# Définir le répertoire de travail
WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances
RUN npm ci --only=production

# Copier le code source
COPY . .

# Exposer le port
EXPOSE 6001

# Variables d'environnement par défaut
ENV NODE_ENV=production
ENV WEBSOCKET_PORT=6001

# Commande de démarrage
CMD ["npm", "start"]
