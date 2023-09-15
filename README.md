# Simple MSAL code for remixjs

configs are in `.env.bak`. Update the content and rename the file as `.env`

## Configuration

In Azure Active Directory, make sure you whitelist the following domain

If domain is http://localhost:3000 (configurable as AAD_BASE_HOST_URL)

- http://localhost:3000/api/auth/login_callback

## Requirements

- node 16+

## How to run?

`npm i && npm start`
