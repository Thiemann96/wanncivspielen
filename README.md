# Wann Civ spielen?

Verfügbarkeits-Kalender für Max, Julian, Yannick und Eric. React (Vite) auf GitHub Pages, Daten in Supabase.

## Einrichtung

1. **Supabase:** Projekt anlegen und `supabase/schema.sql` im SQL-Editor ausführen.
2. **Gemeinsamer User:** Unter Authentication → Users → *Add user* den User `civ@wanncivspielen.local`
   (oder eigene E-Mail, dann `VITE_SHARED_EMAIL` anpassen) mit dem gemeinsamen Passwort anlegen und *Auto Confirm* aktivieren.
   Unter Authentication → Sign In / Providers *Allow new users to sign up* deaktivieren.
3. **Lokal:** `.env.example` nach `.env.local` kopieren und URL und anon key eintragen, dann `npm install` und `npm run dev`.
4. **GitHub Pages:** Repo `wanncivspielen` anlegen (sonst `base` in `vite.config.ts` anpassen), unter Settings → Pages
   als Source *GitHub Actions* wählen und unter Settings → Secrets → Actions die Secrets
   `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` und `VITE_SHARED_EMAIL` anlegen. Jeder Push auf `main` deployt.

## Kopfbilder

Die Fotos sind nicht im Repo. Online liegen sie im privaten Supabase-Storage-Bucket `heads` als
`max.jpg`, `julian.jpg`, `yannick.jpg` und `eric.jpg` (256×256) und sind nur nach dem Login abrufbar.
Lokal kann man sie zusätzlich unter `public/heads/` ablegen (gitignored). Ohne Bild wird ein farbiger Kreis mit Initiale angezeigt.
