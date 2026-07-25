<<<<<<< HEAD
Firebase setup and deploy (quick guide)

1) Install Fireadd base CLI

```bash
npm install -g firebase-tools
```

2) Login

```bash
firebase login
```

3) Initialize in your project folder (choose Firestore and Storage when prompted)

```bash
cd "c:\Users\Administrator\Documents\projects\optical store"
firebase init
```

- When `firebase init` runs:
  - Select your Firebase project.
  - Enable Firestore and Storage rules.
  - Use existing `firestore.rules` and `storage.rules` files (or let the wizard create them and replace contents with the files in this repo).

4) Deploy rules

```bash
firebase deploy --only firestore:rules,storage
```

5) Notes
- The provided rules allow public read access (so images and catalog are visible) but require Firebase Authentication for writes. For production, create admin accounts and require auth for write operations.
- If you want fully public testing rules, use the copies available in the Admin UI under "Firebase Security Guide" (only for short-term development).
- After deploying rules, you can use the Admin UI's "Test connection" and "Sync to cloud now" buttons.

6) Quick local deploy steps (replace project id)

Option A — set project in `.firebaserc`:

1. Open `.firebaserc` and replace `<YOUR_FIREBASE_PROJECT_ID>` with your actual project ID from the Firebase Console.
2. Run:

```bash
cd "c:\Users\Administrator\Documents\projects\optical store"
firebase deploy --only firestore:rules,storage
```

Option B — use Firebase CLI to select project interactively:

```bash
cd "c:\Users\Administrator\Documents\projects\optical store"
firebase use --add
# select your project when prompted and give it the alias 'default'
firebase deploy --only firestore:rules,storage
```

If `firebase` is not found in your PATH, ensure you installed the CLI globally with `npm i -g firebase-tools` and re-open your terminal.
=======
Firebase setup and deploy (quick guide)

1) Install Fireadd base CLI

```bash
npm install -g firebase-tools
```

2) Login

```bash
firebase login
```

3) Initialize in your project folder (choose Firestore and Storage when prompted)

```bash
cd "c:\Users\Administrator\Documents\projects\optical store"
firebase init
```

- When `firebase init` runs:
  - Select your Firebase project.
  - Enable Firestore and Storage rules.
  - Use existing `firestore.rules` and `storage.rules` files (or let the wizard create them and replace contents with the files in this repo).

4) Deploy rules

```bash
firebase deploy --only firestore:rules,storage
```

5) Notes
- The provided rules allow public read access (so images and catalog are visible) but require Firebase Authentication for writes. For production, create admin accounts and require auth for write operations.
- If you want fully public testing rules, use the copies available in the Admin UI under "Firebase Security Guide" (only for short-term development).
- After deploying rules, you can use the Admin UI's "Test connection" and "Sync to cloud now" buttons.

6) Quick local deploy steps (replace project id)

Option A — set project in `.firebaserc`:

1. Open `.firebaserc` and replace `<YOUR_FIREBASE_PROJECT_ID>` with your actual project ID from the Firebase Console.
2. Run:

```bash
cd "c:\Users\Administrator\Documents\projects\optical store"
firebase deploy --only firestore:rules,storage
```

Option B — use Firebase CLI to select project interactively:

```bash
cd "c:\Users\Administrator\Documents\projects\optical store"
firebase use --add
# select your project when prompted and give it the alias 'default'
firebase deploy --only firestore:rules,storage
```

If `firebase` is not found in your PATH, ensure you installed the CLI globally with `npm i -g firebase-tools` and re-open your terminal.
>>>>>>> 02b7bb53d64b00c9edf1aa76e3b62ac1c63095f0
