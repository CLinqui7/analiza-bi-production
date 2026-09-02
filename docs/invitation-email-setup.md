# Invitation Email Setup

Analiza BI sends user invitations from the server, not from the browser.

## Required Variables

```text
DATABASE_URL
APP_URL
SMTP_HOST
SMTP_PORT
SMTP_SECURE
SMTP_USER
SMTP_PASSWORD
SMTP_FROM
```

For Google Workspace:

```text
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=analiza@interactivecore.app
SMTP_FROM="Analiza BI <analiza@interactivecore.app>"
```

`SMTP_PASSWORD` must be a Google app password generated for the same mailbox. Do not commit it, paste it into screenshots, or place it in a browser-visible variable.

## Flow

1. An authorized admin invites a user from `Usuarios y permisos`.
2. The server validates the role hierarchy and scope.
3. The server creates a `user_invitations` record in PostgreSQL.
4. The raw invitation token is sent by email; only its hash is stored.
5. The invited user opens the link, creates their password, and the server activates the matching `auth.users`, `profiles`, `user_roles`, and scoped access records.
6. After activation, the invitation is marked as accepted and its token hash is cleared so the link cannot be reused.
7. Audit records keep the action trace without storing secrets.

The self-hosted PostgreSQL flow lets each invited user crear su contrasena from the invitation link and then enter with email and password. Passwords are hashed server-side and are never sent back to the browser after submission.
