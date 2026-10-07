# Guida al Deployment di SpotiShare 🚀

Questa guida spiega come portare l'app dal tuo computer locale a un server pubblico (accessibile a distanza) utilizzando **Vercel**, la piattaforma ufficiale per Next.js.

## 1. Caricamento su GitHub
Per pubblicare l'app, il codice deve essere su un repository GitHub.
1. Crea un nuovo repository su [github.com](https://github.com).
2. Inizia a tracciare il codice (se non lo hai già fatto):
   ```bash
   git init
   git add .
   git commit -m "Initial commit: SpotiShare ready for production"
   git branch -M main
   git remote add origin https://github.com/TUO_UTENTE/spotishare.git
   git push -u origin main
   ```

## 2. Deploy su Vercel
1. Accedi a [vercel.com](https://vercel.com) con il tuo account GitHub.
2. Clicca su **"Add New"** $\rightarrow$ **"Project"**.
3. Importa il repository `spotishare`.
4. **IMPORTANTE: Variabili d'Ambiente**. Nella sezione "Environment Variables", aggiungi esattamente queste chiavi (prendile dal tuo file `.env.local`):
   - `NEXT_PUBLIC_SUPABASE_URL`: (Il tuo URL di Supabase)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: (La tua chiave anonima Supabase)
   - `NEXT_PUBLIC_ONESIGNAL_APP_ID`: (Il tuo App ID di OneSignal)
5. Clicca su **"Deploy"**.

Vercel ti assegnerà un URL simile a `spotishare-abc.vercel.app`. Copia questo URL.

## 3. Configurazione Redirect (Passaggio Fondamentale)
L'autenticazione Spotify fallirà se non aggiorni gli URL di reindirizzamento, perché Spotify non accetterà più `localhost:3000`.

### A. In Supabase
1. Vai su **Authentication** $\rightarrow$ **URL Configuration**.
2. In **Site URL**, inserisci l'URL di Vercel (es. `https://spotishare-abc.vercel.app`).
3. In **Redirect URLs**, aggiungi:
   - `https://spotishare-abc.vercel.app/auth/callback`
   - `https://spotishare-abc.vercel.app/dashboard`

### B. In Spotify Developer Dashboard
1. Vai su [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard).
2. Seleziona la tua app.
3. In **Settings**, cerca il campo **Redirect URIs**.
4. Aggiungi l'URL di callback di Supabase. Di solito ha questo formato:
   `https://modjujyhvhswrxyawrbg.supabase.co/auth/v1/callback`
   *(Sostituisci `modjujyhvhswrxyawrbg` con l'ID del tuo progetto Supabase)*.
5. Salva le modifiche.

## 4. Test Finali
- Apri l'URL di Vercel.
- Prova a fare il login con Spotify.
- Verifica che le notifiche push di OneSignal vengano richieste correttamente.
- Verifica che i pagamenti vengano registrati nel database di Supabase.
