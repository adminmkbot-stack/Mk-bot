# Admin boundary

The future admin experience belongs in a separately authorized server/API surface, not in the guest dashboard or a client-side email check. The designated address `adminmkbot@gmail.com` is an identity to verify, not a self-service privilege grant. A trusted server must validate Firebase ID tokens and require an out-of-band custom claim or server-managed allowlist before any admin operation.

Do not make conversation contents available to administrators by default. Define narrowly scoped support workflows, audit access, and minimize retained data before exposing any user records. No admin routes, privileges, or conversation access are enabled in this MVP.