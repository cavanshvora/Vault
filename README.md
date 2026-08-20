# VAULT Mobile — Phase 1 (Drive backup + Calendar sync)

This is a working starting slice of the Android app, built as an Expo (React
Native) project. It does **not** yet have the full FD/insurance/documents UI
from the desktop app — by design, this phase focuses on the hardest part:
getting Google OAuth, encrypted Drive backup, and Calendar sync working on a
phone. Once this is solid, the rest of the screens get built on top of it.

## What's here

- **Connect tab** — Google sign-in (Drive + Calendar scopes).
- **FDs & Sync tab** — add a test FD, push its maturity date to Google
  Calendar (same reminder schedule as desktop: 30/7/1 days before).
- **Backup tab** — encrypt the local database + documents folder with
  AES-256-GCM and upload to a "VAULT Backups" folder in Drive. The encryption
  format is byte-identical to `backup_service.py`, so backups are
  interchangeable between phone and desktop.

## What's NOT here yet

- Insurance add form (schema exists, UI doesn't)
- Full backup **restore-in-place** (currently decrypts and confirms the
  backup is valid, but doesn't overwrite the live database yet — that's the
  next piece once you're happy with this slice)
- QR labels, documents viewer, reports, mutual funds, PIN lock, profiles
- Persistent refresh tokens (see "Known limitation" below)

## 1. Google Cloud Console setup

You'll do this in the **same Google Cloud project** your desktop
`credentials.json` came from (or a new one — either works).

1. Go to console.cloud.google.com → your project → **APIs & Services**.
2. Under **Enabled APIs**, make sure both are on:
   - Google Drive API
   - Google Calendar API
   (Your desktop app already needed these, so likely already enabled.)
3. **OAuth consent screen** — if not already configured, set it up (External
   is fine for personal use; add your own Google account under "Test users"
   while the app is unpublished).
4. **Credentials → Create Credentials → OAuth client ID → Android**.
   - Package name: `com.vanshvora.vault` (matches `app.json` — change both
     together if you want a different package name).
   - SHA-1 certificate fingerprint: get this after you run `eas build`
     the first time (Expo generates and manages the signing key for you and
     shows the SHA-1 in the build output / in `eas credentials`), or generate
     your own with:
     ```
     keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
     ```
     for local testing.
5. Copy the resulting **Client ID** (ends in `.apps.googleusercontent.com`)
   into `src/config.ts` → `GOOGLE_ANDROID_CLIENT_ID`.

This is the fiddliest step — a mismatched SHA-1 or package name gives a
generic "Error 400: invalid_request" with no useful detail. If that happens,
it's almost always this.

## 2. Running it

Two ways to get an installable `.apk`. Either works — pick one.

### Option A — EAS Build (Expo's cloud service)

```bash
npm install -g eas-cli
cd vault-mobile
npx expo login          # free Expo account
eas build:configure
eas build --platform android --profile preview
```

Gives you a download link once the cloud build finishes (~10-15 min). Expo
manages the signing keystore for you — get its SHA-1 via `eas credentials`.

### Option B — GitHub Actions (no Expo account, no build queue)

The `android/` native project is already generated and committed (via
`expo prebuild`), and `.github/workflows/build-android.yml` builds it on
GitHub's own runners, which come with the Android SDK preinstalled — fully
free, no Expo account, no monthly build limits.

1. **Generate a signing keystore once, locally** (needs a JDK — `keytool`
   ships with it):
   ```bash
   keytool -genkeypair -v -keystore vault-release.keystore \
     -alias vault -keyalg RSA -keysize 2048 -validity 10000
   ```
   You'll be prompted for a keystore password and a key password — write
   these down, you need them below.
2. **Get its SHA-1** (for the Google OAuth client, same as step 5 in the
   walkthrough above):
   ```bash
   keytool -list -v -keystore vault-release.keystore -alias vault
   ```
3. **Push this project to a new GitHub repo** (private is fine):
   ```bash
   git init && git add . && git commit -m "VAULT mobile phase 1"
   git remote add origin https://github.com/<you>/vault-mobile.git
   git push -u origin main
   ```
4. **Add four repo secrets** — GitHub repo → Settings → Secrets and
   variables → Actions → New repository secret:
   | Secret name | Value |
   |---|---|
   | `ANDROID_KEYSTORE_BASE64` | output of `base64 -w0 vault-release.keystore` (Linux/WSL) or `base64 -i vault-release.keystore` (Mac) |
   | `ANDROID_KEYSTORE_PASSWORD` | keystore password from step 1 |
   | `ANDROID_KEY_ALIAS` | `vault` |
   | `ANDROID_KEY_PASSWORD` | key password from step 1 |
5. **Run the workflow** — GitHub repo → Actions tab → "Build Android APK" →
   Run workflow. Takes 3-5 min. Download the `vault-release-apk` artifact
   from the finished run, unzip it, install `app-release.apk` on your phone.

Every push to `main` that touches app code re-triggers the build
automatically, always signed with the same key — so the SHA-1 you registered
with Google never goes stale.

### Faster local iteration

`npx expo start` + the Expo Go app works for everything **except** the
Google sign-in screen (Google OAuth needs your app's real package name +
SHA-1, which Expo Go doesn't have). Use a built APK (either option above) to
test the Connect flow.

## Known limitation: token lifetime

To keep this phase simple, Connect currently gets a short-lived access token
(~1 hour) without a persistent refresh token. Google's guidance is not to
store a client secret inside a mobile app, so a *real* persistent refresh
token needs a small backend (even a free Cloud Function) to hold the secret
and exchange codes safely. That's a clean, contained next step — flag when
you want it and we'll add it without disrupting anything built here.

## File map

```
App.tsx                        tab switcher, DB init
src/config.ts                  client ID + constants (edit this first)
src/db.ts                      local SQLite (fds, insurance tables)
src/crypto.ts                  AES-256-GCM matching desktop format
src/zip.ts                     zip/unzip backup payload (fflate)
src/googleAuth.ts              OAuth (Drive + Calendar scopes)
src/driveService.ts            upload/list/download backups
src/calendarService.ts         create/update maturity & premium events
src/screens/ConnectScreen.tsx
src/screens/SyncScreen.tsx
src/screens/BackupScreen.tsx
```
