# Firebase adapter boundary

This directory is reserved for client adapters behind UI-independent contracts. Do not initialize Firebase until the owner supplies a Firebase project and deployment configuration. Keep web app configuration in deployment environment settings, never commit `.env` files, and never place service-account credentials or Admin SDK code in this client directory.

Recommended adapters: email/verified-identity authentication with an optional future phone provider; Firestore repositories scoped to the verified UID; and Storage uploads constrained to that same UID. Client APIs should receive the authenticated UID from the verified auth session, not from form fields. Enforce access in Firestore/Storage Security Rules and test with the Firebase Emulator Suite. Sign-out clears local auth state only; it does not delete cloud records.

See the root README for the required project setup, suggested data paths, and deployment checklist. No Firebase SDK or credentials are configured in this MVP.