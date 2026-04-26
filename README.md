# otp

A basic web application developed using Remix.js and React. This app offers Single Sign-On (SSO) login via either **Microsoft / Azure AD** or **Google** and enables you to oversee Multi-Factor Authentication (MFA) Time-Based One-Time Password (TOPT) tokens from various providers.

## Background

### What is OTP?

OTP stands for "One-Time Password." It is a security feature commonly used in two-factor authentication (2FA) systems to enhance the security of online accounts and transactions. OTPs are temporary codes or passwords that are valid for a single use or a short period of time, typically 30 to 60 seconds.

### Why I am doing this?

Numerous apps offer the capability to sync and manage your OTPs. However, many of them suffer from common issues, including limited cross-platform support (restricted to Windows, Mac, Android, or iOS), deficiencies like the absence of search and sorting features, inconsistent user experiences across various platforms, reliance on the vendor for ongoing support, vulnerability due to their large size making them attractive targets for hackers, and more.

## Tech Stacks

- Remix JS / Node JS.
- MUI.
- Instascan for QR Code scanner.
- otplib for OTP code generation.
- Data is persisted in a local SQLite database (`otp.db`) via Node's
  built-in `node:sqlite` — no extra dependencies. Encryption at rest will
  come at a later date.
- Azure AD or Google for OAuth / authentication. Each provider has its own
  per-user vault inside the database (rows are keyed by
  `<email>-<provider>`) — pick one and stick with it; logging in through
  the other provider gives you a brand new empty list.

## Features

### List of OTP Items

This will display a comprehensive list of all OTP items that have been added or synchronized.
![image](https://github.com/synle/otp/assets/3792401/9866c83d-6266-4f07-baf1-b4a32a3c0164)

### QR Code View

This facilitates the process of scanning or registering with a new app, such as Google Authenticator or Twilio Authy.
![image](https://github.com/synle/otp/assets/3792401/2d37c191-ba2a-4e6a-9e2b-c5db90b77d52)

### Edit OTP View

The Edit OTP view enables you to modify the name of the OTP, along with OTP code.
![image](https://github.com/synle/otp/assets/3792401/d2af4f61-3f03-4217-8d5d-1cfd0bf48e69)

### New OTP View

This new OTP view enables you to generate a new OTP item.
![image](https://github.com/synle/otp/assets/3792401/99a3464e-823d-4a37-9bbb-ca9b3c3f30f9)

### QR Code Scanner

The QR code scanner within the new OTP view provides a fast way to scan a QR code for adding a new OTP item.
![image](https://github.com/synle/otp/assets/3792401/c144b1f6-54c3-4d60-a768-c6cf2bbe1168)

## How to run in dev?

Configure at least one SSO provider in your `.env`. You can use either or
both; whichever button you click on the login screen drives the rest of the
session.

```env
# Required in production. In dev, falls back to AAD_SSO_CLIENT_VALUE then a
# literal so the app boots without env vars.
SESSION_SECRET=...

# Microsoft / Azure AD
AAD_SSO_TENANT_ID=common
AAD_SSO_CLIENT_ID=...
AAD_SSO_CLIENT_VALUE=...

# Google (register the dev redirect URI in the Google Cloud Console:
# http://localhost:3000/api/auth/google/login_callback)
GOOGLE_OAUTH_CLIENT_ID=...
GOOGLE_OAUTH_CLIENT_SECRET=...
```

```bash
npm run dev

# test locally over HTTPS (camera / OAuth need it)
ngrok http 3000
```

## How to run in prod?

Ensure that your .env file accurately reflects your environment. Some functionalities, such as Camera API Access and OAuth, necessitate serving the app over an HTTPS protocol. You have the option to host it independently or utilize ngrok to proxy or tunnel traffic to your local machine.

```bash
npm run build
npm start
```

## How to deploy to Azure

There's a manual GitHub Action that ships the app to **Azure App Service for
Linux** running Node 24:
[`.github/workflows/deploy-azure.yml`](./.github/workflows/deploy-azure.yml).
It runs `npm ci`, `npm run build`, prunes dev deps, and uploads the result
via `azure/webapps-deploy@v3`.

Trigger it from the GitHub UI (**Actions → deploy-azure → Run workflow**) or
with `gh workflow run deploy-azure.yml`. Auto-deploy on tag push is wired
but commented out at the top of the workflow — flip it on once you're happy
with the manual flow.

### One-time Azure setup

1. **Create the App Service** (Linux, Node 24). With the Azure CLI:

   ```bash
   RG=otp-rg
   APP=otp-yourname            # must be globally unique
   PLAN=otp-plan
   LOCATION=eastus

   az group create -n $RG -l $LOCATION
   az appservice plan create -g $RG -n $PLAN --is-linux --sku B1
   az webapp create -g $RG -p $PLAN -n $APP --runtime "NODE|24-lts"
   ```

   The B1 SKU is the cheapest tier that supports Always On (you'll want
   that — App Service idles out the app otherwise and the first request
   is slow).

2. **Tell App Service which port to expose and to use the bundled `node`
   instead of trying to build on the server**:

   ```bash
   az webapp config appsettings set -g $RG -n $APP --settings \
     SCM_DO_BUILD_DURING_DEPLOYMENT=false \
     WEBSITE_NODE_DEFAULT_VERSION=~24
   ```

3. **Set the application settings** (these become env vars at runtime).
   The required ones:

   ```bash
   az webapp config appsettings set -g $RG -n $APP --settings \
     SESSION_SECRET="$(openssl rand -hex 32)" \
     OTP_DB_PATH=/home/site/data/otp.db
   ```

   Then add at least one provider:

   ```bash
   # Microsoft / Azure AD
   az webapp config appsettings set -g $RG -n $APP --settings \
     AAD_SSO_TENANT_ID=common \
     AAD_SSO_CLIENT_ID=<your-app-registration-client-id> \
     AAD_SSO_CLIENT_VALUE=<your-app-registration-client-secret> \
     MICROSOFT_REDIRECT_URL=https://$APP.azurewebsites.net/api/auth/microsoft/login_callback

   # Google
   az webapp config appsettings set -g $RG -n $APP --settings \
     GOOGLE_OAUTH_CLIENT_ID=<from-cloud-console> \
     GOOGLE_OAUTH_CLIENT_SECRET=<from-cloud-console> \
     GOOGLE_REDIRECT_URL=https://$APP.azurewebsites.net/api/auth/google/login_callback
   ```

   `OTP_DB_PATH=/home/site/data/otp.db` matters: `/home` is the persistent
   mount on App Service, so the SQLite file survives slot swaps and
   restarts. The default `${cwd}/otp.db` would land inside `wwwroot` and
   would still survive (it's also under `/home`), but separating data from
   code is cleaner.

4. **Register the redirect URIs** with each provider's portal:
   - **Azure AD** — App registration → Authentication → "Web" platform →
     `https://<APP>.azurewebsites.net/api/auth/microsoft/login_callback`.
     Make sure "ID tokens" is checked.
   - **Google** — Cloud Console → APIs & Services → Credentials → your
     OAuth 2.0 Client → "Authorized redirect URIs" →
     `https://<APP>.azurewebsites.net/api/auth/google/login_callback`.
     Google enforces an exact-match check.

### GitHub secrets

The workflow needs two GitHub Actions secrets, defined on the
**`azure-production` Environment** (Settings → Environments → New
environment). Putting them on an environment instead of repo-wide lets
you require manual approval before a deploy runs.

| Secret | How to get it |
| --- | --- |
| `AZURE_WEBAPP_NAME` | The app name from step 1 (e.g. `otp-yourname`). Plain string, no quotes. |
| `AZURE_WEBAPP_PUBLISH_PROFILE` | Run `az webapp deployment list-publishing-profiles -g $RG -n $APP --xml` and paste the **entire XML output** as the secret value. The action authenticates with this — no Azure AD app/service principal required. |

If you'd rather use OIDC federated credentials (no static secret), set up a
service principal and use `azure/login@v2` before the deploy step. The
publish-profile path is simpler for a single-developer setup, so that's
what's wired by default.

### Triggering a deploy

```bash
gh workflow run deploy-azure.yml
gh run watch
```

After the first deploy, log in once via Microsoft or Google to verify the
flow end-to-end. The first request after Always On wakes the app may take
~10 seconds; subsequent ones are quick.

### Rotating the publish profile

If the publish profile leaks, reset it:

```bash
az webapp deployment list-publishing-profiles -g $RG -n $APP --xml > /dev/null
# Generates new credentials. Copy the XML again into the GitHub secret.
```
