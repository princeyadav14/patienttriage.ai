# Contributing — how we work on this repo

This is our team workflow. Following it keeps `main` always working and means
nobody accidentally overwrites anyone else's work. If you're new to git, just
follow the steps literally — you don't need to understand everything yet.

Team NodeBuild · PatientTriage.ai

---

## The one golden rule

**Never work directly on `main`.** Always make your own branch, do your work
there, and open a Pull Request to merge it in. `main` is our "always working"
version — we protect it.

---

## First-time setup (each teammate does this once)

After you've accepted the collaborator invite:

```bash
git clone https://github.com/YOUR-USERNAME/patienttriage-ai.git
cd patienttriage-ai
npm install
npm run dev
```

`npm install` downloads the project's tools into a `node_modules` folder on your
machine. We never upload that folder (it's huge and everyone regenerates it
themselves) — it's already excluded by `.gitignore`.

If git asks who you are, set it once:

```bash
git config --global user.name "Your Name"
git config --global user.email "your@email.com"
```

---

## The everyday workflow (every time you do a piece of work)

### 1. Start from the latest `main`

Before starting anything new, get everyone's merged changes first:

```bash
git checkout main
git pull origin main
```

### 2. Make your own branch

Give it a short name describing what you're doing:

```bash
git checkout -b feature/business-proposal
```

(Examples: `feature/override-feedback-loop`, `fix/surge-timing`,
`feature/pitch-deck`. The `feature/` or `fix/` prefix is just a tidy convention.)

### 3. Do your work

Edit files, build things, test locally with `npm run dev`.

### 4. Save your work to git (commit)

```bash
git add .
git commit -m "Add first draft of business proposal"
```

Write commit messages that say *what changed*, in plain words. Commit often —
every time you finish a meaningful chunk, not just at the very end.

### 5. Push your branch to GitHub

```bash
git push origin feature/business-proposal
```

(The first time you push a new branch, git may print a longer command to copy —
just run whatever it suggests.)

### 6. Open a Pull Request (PR)

- Go to the repo on GitHub.
- You'll see a banner: "your-branch had recent pushes — Compare & pull request".
  Click it. (Or go to the **Pull requests** tab → **New pull request**.)
- Give it a title and a short description of what you did.
- Click **Create pull request**.

### 7. Get it reviewed, then merge

- A teammate looks at the PR, leaves comments if needed.
- Once it's approved, click **Merge pull request** → **Confirm merge**.
- Then delete the branch when GitHub offers to (keeps things tidy).

### 8. Everyone pulls the update

After a PR is merged, everyone else refreshes their `main`:

```bash
git checkout main
git pull origin main
```

---

## Reviewing a teammate's Pull Request

When someone asks you to review their PR:

1. Open the PR on GitHub.
2. Click the **Files changed** tab to see exactly what they changed (green = added,
   red = removed).
3. If something looks off, click the line and leave a comment.
4. If it's good, click **Review changes** → **Approve**.
5. Then it can be merged (by them or you).

Reviewing doesn't have to be deep — even a quick "does this look reasonable and
does the app still run" check is valuable. It catches mistakes before they hit
`main`.

---

## If two people change the same file (merge conflict)

Sometimes git can't automatically combine two people's changes to the same lines.
This is called a **merge conflict**. Don't panic — it's normal.

- GitHub will show the conflict on the PR page.
- The safest fix for a beginner: tell the team in your group chat, and whoever
  understands the two changes best resolves it together. Conflicts are about
  *deciding which version wins*, which is a human call, not a git problem.
- To avoid them: pull `main` often, keep branches small and short-lived, and try
  not to have two people editing the exact same file at the same time.

---

## Quick reference (cheat sheet)

```bash
# start fresh work
git checkout main
git pull origin main
git checkout -b feature/my-thing

# save + share work
git add .
git commit -m "what I changed"
git push origin feature/my-thing
# then open a Pull Request on GitHub

# get everyone's latest after a merge
git checkout main
git pull origin main
```

---

## Suggested split of work (so we don't collide)

Because we're editing different areas, we naturally avoid conflicts if we own
different parts:

- **Prototype / code** — owner works in `src/`
- **Business proposal document** — owner works in `docs/` (separate folder)
- **Pitch deck** — kept outside the repo (PowerPoint), or a link in `docs/`

Keeping the proposal and deck in their own folders/files means the code and the
documents almost never touch the same file — which means almost no conflicts.
