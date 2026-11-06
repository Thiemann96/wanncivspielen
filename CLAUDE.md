# CLAUDE.md – Wann Civ spielen?

Kleine Web-App, mit der vier Freunde (Max, Julian, Yannick, Eric) eintragen, an welchen Tagen und ab wann sie Zeit für Civilization haben. Sie ersetzt das Abstimmen im Gruppenchat. Die App ist für diese vier Leute gebaut, nicht für die Allgemeinheit. Pragmatik und Spaß gehen vor Skalierbarkeit.

## Zusammenarbeit

- Mit dem User **auf Deutsch** kommunizieren. Die UI-Texte und Code-Kommentare sind ebenfalls deutsch.
- **Keine Server starten**, also weder `npm run dev`, `vite preview` noch Docker. Das macht der User selbst. Selbst prüfen mit `npm run build` und `npx eslint .`, danach sagen, was im Browser zu testen ist.
- Ehrlich angeben, was nur gebaut und was tatsächlich im Browser gesehen wurde, denn Letzteres ist meist nicht der Fall.
- Der User iteriert schnell und visuell (Feedback wie „nicht so groß“, „mach 0,8 s“). Kleine Änderungen direkt umsetzen, statt nachzufragen. Ist eine Anweisung mehrdeutig, eine sinnvolle Lesart wählen und sie kurz benennen.
- Witze und Persönlichkeit sind erwünscht (Hover-Karten, „Bekannt für“-Fakten). Inhalte über die Freunde nicht selbst erfinden. Die Fakten tragen die User selbst ein.

## Stack & Hosting

- Vite + React 19 + TypeScript, ohne Router (nur die Zustände Login → Kalender), weil GitHub Pages bei Routen 404 liefert.
- **Hosting: GitHub Pages**, also nur statisch. `base: '/wanncivspielen/'` in `vite.config.ts` muss zum Repo-Namen passen. Das Deployment läuft über `.github/workflows/deploy.yml` bei jedem Push auf `main`.
- **Daten: Supabase.** Ein einziger gemeinsamer Auth-User (gemeinsames Passwort). Danach wählt jeder seinen Namen, gespeichert in `localStorage`. RLS erlaubt alles für `authenticated`. Unter Freunden ist dieses Vertrauensmodell gewollt, die Datenbank prüft deshalb nicht, wer wer ist.
- Keine UI- oder Animationsbibliothek: reines CSS (`src/styles.css`) und `date-fns`.

## Supabase – bekannte Stolperfallen

- Im Frontend den **publishable key** (`sb_publishable_…`) als `VITE_SUPABASE_ANON_KEY` verwenden, niemals den secret/service_role key. Alle `VITE_*`-Werte landen im ausgelieferten JS.
- Das gemeinsame Passwort steht **nie** im Code oder in `VITE_*`-Variablen. `VITE_SHARED_EMAIL` muss exakt der E-Mail des Supabase-Users entsprechen. Ein Tippfehler dort führte schon einmal zu `invalid_credentials`. Die aktuelle Adresse ist `civ@wannspielen.local`.
- Neuere Supabase-Projekte vergeben **keine Tabellenrechte automatisch**. Jede neue Tabelle braucht `grant … to authenticated`, sonst kommt `permission denied for table`.
- Neue Tabellen brauchen `alter publication supabase_realtime add table …` für Live-Updates.
- `supabase/schema.sql` ist kumulativ, aber **nicht idempotent** (`alter publication` schlägt beim zweiten Mal fehl). Bei Schemaänderungen dem User **nur den neuen Block** zum Ausführen geben. SQL führt der User selbst im Supabase-Dashboard aus.

## Architektur (Wo liegt was)

- `src/hooks/useAvailability.ts`: lädt die Einträge eines Zeitraums und hält sie per Realtime aktuell. Jede Instanz nutzt einen eigenen Channel (`useId`).
- `src/lib/allAvailability.tsx`: lädt **alle** Einträge einmal zentral für Statistiken und Tooltips. Nicht pro Hover neu laden.
- `src/lib/facts.tsx`: gemeinsamer Speicher für die „Bekannt für“-Fakten (Tabelle `facts`). Der Autor wird gespeichert, in der UI aber **bewusst nicht angezeigt** (anonym). Nur der Autor sieht das Löschen-×.
- `src/lib/appContext.ts`: `MeContext` (eingeloggter Spieler) und `PickDayContext` (im Kalender zu einem Tag springen), damit Tooltips Aktionen ausführen können.
- `src/components/MonthCalendar.tsx`: Monatsraster bzw. Wochenliste (Umschalter „Woche | Monat“, gespeichert in `localStorage` `wanncivspielen.view`; ohne gespeicherte Wahl startet das Handy ≤600 px in der Woche). Mehrfachauswahl (⌘/Strg-Klick, ⇧-Klick für Bereiche), Wischen blättert, Popover-Editor und Sidebar.
- `src/components/DayEditor.tsx`: Popover neben dem Tag, auf dem Handy ein Panel von unten. Klicks auf `.day`, `.suggestion` und `.hovercard` gelten nicht als „daneben“.
- `src/components/Suggestions.tsx`: Sidebar „Beste Termine“ der nächsten 8 Wochen mit animierter Rangliste (`useAnimatedList` + FLIP in `useAnimatedList.ts`).
- `src/components/Leader.tsx`: Vorderseite der Anführer-Karte (`LeaderFront`) und Statistiken. Wird vom Anführer-Fenster **und** vom Hover-Tooltip genutzt.
- `src/components/LeadersScreen.tsx`: Übersicht im Stil eines Great-People-Bildschirms. Die Karten drehen sich in 3D und zeigen hinten die Wochentags-Statistik. Auf dem Handy (≤640 px) stattdessen ein gemischter Kartenstapel (`LeaderDeck`): links wischen = nächste, rechts = vorige Karte, Tippen dreht.
- `src/components/HoverCard.tsx`: Tooltip an jedem Kopf. Er rastet nach `LOCK_AFTER` ms ein und ist dann bedienbar (scrollen, Termine anklicken, Fakten hinzufügen).
- `src/components/LeaderSheet.tsx` + `src/lib/leaderSheet.tsx`: Touch-Pendant zum Tooltip. Antippen eines Kopfes (in `HoverCard`) öffnet die Karte als Panel von unten. Das Panel hängt zentral in `App`, schließt per Tippen daneben, Wischen nach unten, × oder Esc. Jeder Kopf, der Details zeigen soll, wird in `HoverCard` gewickelt.
- `src/lib/civ.ts`: `civNight()`/`civNights()` erkennen Civ-Abende (alle vier „ja“). Wird von Kalender, Ereignissen und Zeitalter genutzt.
- `src/components/CivEvents.tsx`: vergleicht den Stand aus `allAvailability` mit dem vorherigen. Ein neuer Civ-Abend löst das Overlay „Weltwunder vollendet“ aus (`CivOverlay.tsx`). Änderungen der anderen erscheinen als Diplomatie-Toasts, die 1 s lang gesammelt werden. Der erste Ladestand gilt als Ausgangslage. setState nur in Timern, wegen der Regel `react-hooks/set-state-in-effect`.
- `src/components/EraBadge.tsx` + `src/lib/eras.ts`: Zeitalter nach Zahl der vergangenen Civ-Abende. Das zuletzt gesehene Zeitalter steht in `localStorage` (`wanncivspielen.era`), ein Aufstieg zeigt einmalig ein Overlay.
- `src/components/QuoteBar.tsx` + `src/lib/quotes.ts`: rotierende Ladebildschirm-Zitate unter dem Kalender und auf dem Login.
- `src/components/Logbook.tsx` + `src/lib/logbook.tsx`: Logbuch/Shoutbox (Tabelle `logbook`, Arten in `LOG_KINDS` in `types.ts`: Ankündigung, Bericht, Freundschaft, Versöhnung, Verleumdung. Die letzten drei können über `targets` an bestimmte Spieler gehen, Farben als `--log-*`-Tokens. Filterleiste nach Art und „An mich“. Autor wird angezeigt, nur er sieht das ×). Zitate über `logbook.quote_id` (`on delete set null`), Reaktionen in `logbook_reactions` (ein Emoji pro Spieler und Eintrag höchstens einmal, `LOG_REACTIONS` in `types.ts`). Der Provider lädt die neuesten 200 Einträge zentral per Realtime. Der Gelesen-Stand liegt pro Spieler in `localStorage` (`wanncivspielen.logbook.read.<id>`), und der Button zeigt ungelesene Einträge der anderen als Badge.
- `src/players.ts`: die vier festen Spieler samt Beinamen (`title`, vom User vorgegeben). Die Kopfbilder (256×256-JPGs) liegen online im **privaten** Storage-Bucket `heads` und werden nach dem Login über signierte URLs geladen (`src/lib/heads.ts`). Lokal liegen sie zusätzlich in `public/heads/` als Fallback, die Originale in `assets/heads-original/`. Nichts in `dist/` ablegen, das wird beim Build überschrieben.
- **Persönliches kommt nicht ins Repo:** Fotos (`public/heads/*`, `assets/heads-original/`) und persönliche Startdaten (`supabase/*.local.sql`) sind gitignored. Im Code stehen nur die Vornamen. Fakten über die Freunde gehören in die Datenbank, nicht in Code oder `schema.sql`.

## Design

- **Stil eines 4X-Strategiespiels**, angelehnt an die Civ-6-UI, aber ohne echte Spielgrafiken oder Logos: dunkelblaue Panels mit Goldrahmen, petrolfarbene Titelleisten, weinrote Porträtkarten, Pillen-Buttons mit Goldrand, Hex-Hintergrund. Schriften: Cinzel (Überschriften) und Source Sans 3 (Fließtext), beide über Google Fonts in `index.html`.
- Alle Farben sind Tokens in `:root` in `styles.css`. Statusfarben: `--yes` grün, `--maybe` gelb, `--no` rot. Der Status erscheint als farbiger Ring um den Kopf (`.ring .ring-<status>`).
- Wochenenden sind hervorgehoben (getönt, Abstand vor dem Samstag). Tage, an denen alle vier können, sind gold („Civ-Abend!“).
- Animationen sind ausdrücklich gewünscht (Übergänge, Popover, Listen). Alle laufen in CSS oder über die Web Animations API und respektieren `prefers-reduced-motion`. JS-Animationen prüfen das selbst.
- **Diagrammfarben** sind eigene, per Skript geprüfte Tokens (`--chart-yes`, `--chart-maybe`), nicht die Statusfarben. Grün und Gelb sind bei Rot-Grün-Schwäche zu ähnlich, deshalb ist „Vielleicht“ zusätzlich schraffiert und mit Legende versehen.

## CSS-Fallstricke

- `styles.css` ist groß, und Regeln gleicher Spezifität **überschreiben sich nach Reihenfolge**. Beispiel: `.leader-face { position: absolute }` steht weiter unten als die Tooltip-Variante. Deshalb heißt diese `.leader-face.leader-face-static`. Beim Überschreiben die Spezifität erhöhen, statt auf die Reihenfolge zu vertrauen.
- Gleiche Höhen und Ausrichtung in den Anführer-Karten entstehen durch feste Höhen (`.leader-known`) und einen Terminbereich, der den Rest füllt (`flex: 1 1 0`). Im Tooltip zeigt die Liste stattdessen maximal 4 Zeilen.
- Werte, die an zwei Stellen stehen, gemeinsam ändern: `LOCK_AFTER` in `HoverCard.tsx` und die Dauer von `.lock-bar` in `styles.css`.

## Prüfen

```bash
npm run build      # tsc -b && vite build
npx eslint .       # muss Exit 0 liefern
```

Es gibt keine Tests. Was sich nur im Browser zeigt (Layout, Animationen, Realtime zwischen zwei Fenstern), dem User als Prüfschritt nennen.
