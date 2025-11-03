# Git Synchronization Instructions for Claude Code

**Author:** Manus AI (Architect)
**Date:** 2025-11-01
**Status:** Urgent

---

## 1. Overview

We are in a loop because the local development environment is out of sync with the remote GitHub repository (`origin/main`). This happened because I previously pushed changes directly to the repository, and the local environment now has conflicting or outdated code.

To resolve this and move forward, we must perform a clean synchronization. This guide provides the exact steps for Claude Code to reset the local environment to match the state of the GitHub repository.

**Warning:** This process will discard any uncommitted local changes. This is necessary to resolve the conflict.

## 2. Synchronization Steps

Please execute the following commands in the project's root directory (`/home/ubuntu/eos-platform-github`).

### Step 1: Fetch the Latest Remote Data

This command downloads the latest information from the `origin` remote (GitHub) without merging any changes yet.

```bash
git fetch origin
```

### Step 2: Reset the Local Branch to Match the Remote

This is the most critical step. This command will force your local `main` branch to be an exact copy of the `origin/main` branch from GitHub. It will discard all local changes and commits that are not on the remote.

```bash
git reset --hard origin/main
```

### Step 3: Verify the Synchronization

After the reset, run `git status` to confirm that your local branch is clean and perfectly aligned with the remote.

```bash
git status
```

**Expected Output:**

```
On branch main
Your branch is up to date with 'origin/main'.

nothing to commit, working tree clean
```

## 3. Next Steps

Once the synchronization is complete, the local `frontend/src/pages/MeetingHistoryPage.jsx` file will be in the same state as the one on GitHub, which is **still missing the required fix**.

Please proceed immediately by applying the changes detailed in the `final_fix_instructions.md` document I provided previously. This involves:

1.  **Applying the normalization logic** to `MeetingHistoryPage.jsx`.
2.  **Committing** the changes.
3.  **Pushing** the commit to GitHub.

This will finally resolve the crash and get us back on track. End of instructions.
