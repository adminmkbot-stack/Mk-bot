# MK BOT — A Smart AI Robot Brain

MK BOT is a mobile-first assistant interface for Hausa and English, owned by Mubarak Isyaku. This repository currently contains a working browser MVP; account authentication, cloud storage, and AI responses are deliberately not claimed as active features.

## Architecture

The current app is a responsive, dependency-free web client built from native HTML, CSS, and ES modules. UI, translations, chat-provider contract, and user-entered memory service are separate modules. The web client is the first presentation layer; future Android and iOS apps should use the same authenticated backend/API contracts rather than putting Firebase admin access or AI provider secrets in a mobile client. Flutter Web was considered but Flutter and Dart are not installed in the current environment, so this MVP does not depend on them. A web build can later be wrapped with a native shell or paired with separately built Flutter clients.

Guest conversations and interface/response language preferences persist in browser local storage on this device. Explicit memories remain in the current page session. No precise location is collected, and the app does not infer sensitive traits. Sign-in and sign-up forms are interface placeholders and do not submit or store credentials.

## Run locally

Requirements: Node.js 20 or newer. No package installation is needed.

```sh
npm run dev
```

Open <http://localhost:4173>. Set `PORT` to use a different port. Run the built-in tests with:

```sh
npm test
```

## Language support

The searchable locale catalogue includes more than 100 language codes with their English proper name, native display name (from the runtime's ICU/CLDR data), locale code, direction, and explicit interface translation availability. Hausa and English are the only complete interface dictionaries. Other choices are available for language preferences, but the UI uses an English fallback and identifies that status; selecting Arabic or another RTL language also sets the document direction to RTL. UI dictionary key parity is tested. Translation availability indicates dictionary coverage, not human editorial certification.

The interface locale and preferred response locale are separate settings. Response preference persists independently in browser local storage. Automatic response-language selection calls an injected detector with `{ detectLanguage({ text }) }` when configured, otherwise it falls back to the interface locale; provider failure does not block or rewrite the original message. The selected response locale is passed with the unchanged conversation to the AI provider. The current MVP has no detector or AI provider configured, so automatic detection is not active and conversations do not receive generated replies. Chat adapters must explicitly list `supportedLanguages`; requests in unadvertised or undeclared languages are rejected.

Text conversation, translation, speech recognition, and speech synthesis have separate capability entries. The registry reports `supported`, `unsupported`, `unknown`, or `not-configured` from explicitly advertised provider language lists. Speech input and output use separate services. Translation requires a configured provider and returns both the original and translated text; it is never silently applied to chat messages. No speech or translation provider is configured in this repository.

The Learn screen includes a source/target translation tool. It reports that translation is unavailable and does not send the entered text until an adapter is configured. Translation adapters must advertise exact supported pairs (for example, `ha:en`) and implement the translation method before the service accepts a request.

`src/services/languageProviderRegistry.js` supports provider comparison using explicit per-language quality records: benchmark ID, metric, score from 0 to 1, sample count, and evaluation timestamp. It ranks only providers with matching benchmark and metric and returns no recommendation when evidence is missing. These records must come from owner-run evaluation; no provider or language quality has been benchmarked in this repository.

To add a language, add its valid locale code to `src/languageCatalog.js`, verify its English/native names and direction, and add a complete dictionary to `src/i18n.js` before marking it as an available interface translation. Add and test provider language declarations independently for text, translation pairs, recognition, and synthesis. Do not infer model/provider coverage from the size of the UI catalogue.

## MVP features

- Hausa-first interface with English and a searchable multilingual catalogue that clearly marks untranslated UI languages.
- Responsive splash, login, sign-up, dashboard, chat, learning/quiz, and profile views.
- Guest chat threads persist locally on this device and can be searched/reopened from the navigation drawer. Without a configured provider, sending a message produces an explicit not-configured response; no AI answer is fabricated.
- User-entered, reviewable, deletable session memories. Interface language and preferred response language are saved separately in browser local storage.
- Accessible navigation, keyboard chat submission, reduced-motion support, and basic security headers from the local static server.

## Firebase setup still required

No Firebase project, configuration, credentials, SDK, or security rules are present. Before enabling accounts or cloud data:

1. Create a Firebase project and register the web app. Provide the public web app configuration through the chosen build/deployment environment; do not commit private keys or `.env` files. Firebase web configuration is not an admin credential, but access must still be protected by Authentication and Security Rules.
2. Enable Firebase Authentication email/password. Verify email addresses before granting account features. Add phone authentication later as a separately verified sign-in method; store a stable Firebase UID as the account ID and keep phone number optional.
3. Create Cloud Firestore and Storage. Scope every user-owned record and storage path to `request.auth.uid`; deny access by default and test rules with the Firebase Emulator Suite. Logging out must only end the local session and must never delete Firestore documents or Storage objects.
4. Put admin authorization in a trusted server/Cloud Function using verified Firebase identity and a server-managed custom claim or allowlist. The designated address `adminmkbot@gmail.com` is not authorization by itself: verify identity and grant privileges only out of band. Keep admin access separate and avoid exposing conversations unless a specific authorized support workflow requires it.
5. Add Firebase client initialization and adapters only after environment config and tested rules exist. Never ship service-account credentials or Admin SDK secrets to browser/mobile clients.

Suggested ownership model: `users/{uid}` for profile/preferences, `users/{uid}/memories/{memoryId}` for explicitly saved memories, and `users/{uid}/conversations/{conversationId}` with message subcollections or bounded message arrays. Storage objects should use `users/{uid}/...` paths and matching UID checks. Define retention, export, and deletion behavior before persisting conversation content.

## AI provider setup still required

There is no AI provider or translation service configured. Add a server-side endpoint (for example, a Cloud Function) that authenticates requests, applies rate limits and input limits, calls the selected provider using a server-only secret, and returns a validated response. Configure provider keys in the hosting platform's secret manager, never in browser code, mobile bundles, or committed files. Implement and successfully test that endpoint before describing AI responses or automatic translation as available. The current chat service is a provider seam; it rejects requests until a provider adapter is supplied.

## Deploy the website

1. Choose a static host that serves `index.html` and the `src/` assets over HTTPS. For this dependency-free MVP, publish the repository root as the web root; the included Node server is for local development and is not required by a static host.
2. Configure the host to rewrite unknown application routes to `/index.html` if client-side routes are introduced. The current MVP renders its views without URL routes.
3. Verify the production domain, HTTPS, content/security headers, responsive layouts, and `npm test` in CI. If Firebase or an AI endpoint is added, configure domain restrictions, Authentication, rules, and server-side secrets before enabling those features.

## Current limitations

- Firebase, email/phone authentication, Firestore, Storage, and server-side admin authorization are not configured.
- AI chat, automatic language detection, and automatic translation are not enabled; provider seams and capability reporting are present.
- Guest conversations persist in this browser's local storage and are not associated with an authenticated UID; memories remain session-only.
- No browser automation/device screenshot tooling is included in this repository; responsive CSS and navigation are covered by implementation review, while browser/device QA remains a deployment check.
