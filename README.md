# BookSnap

App web per la catalogazione di libri con riconoscimento automatico.

## Requisiti

- Node.js (v16 o superiore)
- npm (v7 o superiore)
- MongoDB (locale o Atlas)

## Installazione

1. Clona il repository:
   ```
   git clone https://github.com/TUO_USERNAME/booksnap.git
   cd booksnap
   ```

2. Installa le dipendenze:
   ```
   npm run install-all
   ```

3. Crea un file .env nella directory principale con:
   ```
   PORT=5000
   NODE_ENV=development
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/booksnap
   JWT_SECRET=your_jwt_secret
   JWT_EXPIRE=7d
   ```

## Utilizzo

Per avviare l'applicazione in modalità sviluppo:
```
npm run dev
```

- Server API: http://localhost:5000
- Client React: http://localhost:3000
