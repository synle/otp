# otp

A basic web application developed using Remix.js and React. This app offers Azure AD Single Sign-On (SSO) login functionality and enables you to oversee Multi-Factor Authentication (MFA) Time-Based One-Time Password (TOPT) tokens from various providers.

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
- Data is currently persisted using file. Encryption will come at a later dates.
- Azure AD for OAuth / authentication.

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

Update the .env file for the Azure AD login. Then rename the file as `.env`.

```bash
npm run dev

# test locally
ngrok http 3000
```


## How to run in prod?
Ensure that your .env file accurately reflects your environment. Some functionalities, such as Camera API Access and OAuth, necessitate serving the app over an HTTPS protocol. You have the option to host it independently or utilize ngrok to proxy or tunnel traffic to your local machine.

```bash
npm run build
npm start
```
