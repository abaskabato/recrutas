---
name: Test before suggesting fixes
description: User wants me to reproduce and test bugs before proposing solutions, not jump to code changes
type: feedback
---

Test the current system and reproduce the bug before suggesting a fix. Don't jump straight to editing code based on a hypothesis.

**Why:** User rejected an edit when I tried to fix a suspected embedding dimension mismatch without testing first. The actual bug turned out to be something completely different (postgres array syntax in exclude clause).

**How to apply:** When user reports something is broken, trace the actual execution path, run the code, and find the real error before touching any files.
