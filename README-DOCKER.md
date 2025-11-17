# Docker Deployment Guide

## Résolution des problèmes de timeout npm

Le Dockerfile a été optimisé pour gérer les problèmes de timeout réseau lors de l'installation des dépendances npm :

### Optimisations implémentées :

1. **Retry automatique** : 3 tentatives avec délais progressifs
2. **Timeouts augmentés** :
   - `fetch-timeout`: 300000ms (5 minutes)
   - `fetch-retry-mintimeout`: 20000ms (20 secondes)
   - `fetch-retry-maxtimeout`: 120000ms (2 minutes)
3. **Connexions limitées** : `--maxsockets=1` pour éviter la surcharge réseau
4. **Mode offline** : `--prefer-offline` pour utiliser le cache npm
5. **Build multi-stage** : Optimisation de la taille de l'image finale

## Installation

### Prérequis
- Docker 20.10+
- Docker Compose 2.0+

### Option 1 : Avec Docker Compose (Recommandé)

```bash
# Build et démarrage
docker-compose up -d

# L'application sera accessible sur http://localhost:3000

# Voir les logs
docker-compose logs -f

# Arrêt
docker-compose down
```

**Note** : Le port par défaut est 3000. Pour changer le port, modifier la ligne `ports` dans `docker-compose.yml` :
```yaml
ports:
  - "VOTRE_PORT:80"  # Exemple: "8080:80" pour le port 8080
```

### Option 2 : Docker seul

```bash
# Build
docker build -t arena-live-quiz:latest .

# Run
docker run -d \
  --name arena-live-quiz \
  -p 3000:80 \
  --restart unless-stopped \
  arena-live-quiz:latest

# Logs
docker logs -f arena-live-quiz

# Arrêt
docker stop arena-live-quiz
docker rm arena-live-quiz
```

## Troubleshooting

### Si les timeouts persistent

1. **Augmenter encore les timeouts** :
   Modifier dans le Dockerfile :
   ```dockerfile
   RUN npm config set fetch-timeout 600000  # 10 minutes
   ```

2. **Utiliser un registre npm local/cache** :
   ```bash
   docker build --build-arg NPM_REGISTRY=https://registry.npmjs.org .
   ```

3. **Build avec BuildKit activé** :
   ```bash
   DOCKER_BUILDKIT=1 docker build -t arena-live-quiz:latest .
   ```

4. **Vérifier la connexion réseau** :
   ```bash
   docker run --rm node:20-alpine sh -c "npm config get registry && curl -I https://registry.npmjs.org"
   ```

5. **Build sans cache** :
   ```bash
   docker build --no-cache -t arena-live-quiz:latest .
   ```

### Erreurs courantes

#### Port déjà utilisé (address already in use)
```bash
# Erreur: "failed to bind host port 0.0.0.0:3000/tcp: address already in use"

# Solution 1 : Changer le port dans docker-compose.yml
# Modifier la ligne ports: de "3000:80" à "8080:80" (ou un autre port libre)

# Solution 2 : Arrêter le service qui utilise le port
docker ps -a  # Trouver le conteneur qui utilise le port
docker stop <container_name>  # Arrêter le conteneur

# Solution 3 : Trouver et arrêter le processus
lsof -i :3000  # Identifier le processus
kill -9 <PID>  # Arrêter le processus
```

#### ECONNRESET
```bash
# Solution : Augmenter les retry et timeouts (déjà fait dans le Dockerfile)
```

#### Network timeout
```bash
# Vérifier la connectivité
ping registry.npmjs.org

# Essayer un autre DNS
docker build --network host -t arena-live-quiz:latest .
```

#### Out of memory
```bash
# Augmenter la mémoire Docker
# Docker Desktop : Settings > Resources > Memory (minimum 4GB recommandé)
```

## Configuration production

### Variables d'environnement

Créer un fichier `.env.production` :

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key
```

Puis modifier docker-compose.yml :

```yaml
services:
  frontend:
    env_file:
      - .env.production
```

### SSL/HTTPS

Pour ajouter HTTPS, utiliser un reverse proxy comme Nginx ou Traefik en amont.

## Health Check

L'application expose un endpoint de santé :

```bash
curl http://localhost:3000/health
# Réponse attendue : "healthy"
```

## Monitoring

```bash
# Statistiques en temps réel
docker stats arena-live-quiz

# Ressources utilisées
docker inspect arena-live-quiz
```

## Mise à jour

```bash
# Pull dernières modifications
git pull origin claude/fix-docker-npm-install-017Szb4XjKnUSijZ9skLtSH5

# Rebuild
docker-compose up -d --build
```
