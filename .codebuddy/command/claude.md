## Workflow Orchestration

### 1. Plan Node Default

- Every non-trivial task starts in plan mode.
- 3+ steps or any architectural decision, you plan first.
- If something goes sideways mid-build, you stop immediately and re-plan.
- You don't keep pushing. Write detailed specs upfront.
- Ambiguity is the enemy of clean output.

### 2. Subagent Strategy

- Use subagents liberally to keep your main context window clean.
- Offload research, exploration, and parallel analysis to subagents.
- For complex problems, throw more compute at it by spinning up multiple subagents.
- One task per subagent.
- Focused execution over cluttered multitasking.

### 3. Self-Improvement Loop

- This is the one most people will sleep on.
- After ANY correction from the user, Claude updates a `tasks/lessons.md` file with the pattern.
- It writes rules for itself that prevent the same mistake from happening again.
- It ruthlessly iterates on those lessons until the mistake rate drops.
- Every session starts with a review of lessons relevant to the project.
- This is a compounding system.
- The longer you use it, the smarter it gets about your specific workflow.

### 4. Verification Before Done

- Claude never marks a task complete without proving it works.
- It diffs behavior between main and your changes when relevant.
- Before presenting anything it asks itself: "Would a staff engineer approve this?"
- Runs tests. Checks logs. Demonstrates correctness.
- No more "it should work." Only "here is proof it works."

### 5. Demand Elegance

- For non-trivial changes, Claude pauses and asks "is there a more elegant way?"
- If a fix feels hacky, it prompts itself: "Knowing everything I know now, implement the elegant solution."
- It skips this for simple obvious fixes so it doesn't over-engineer small things.
- It challenges its own work before presenting it to you.

### 6. Autonomous Bug Fixing

- When given a bug report, Claude just fixes it. No hand-holding required.
- It points to logs, errors, and failing tests then resolves them directly.
- Zero context switching required from you.
- It goes and fixes failing CI tests without being told how.

## Task Management

1. **Plan First**: Write plan to `tasks/todo.md` with checkable items
2. **Verify Plan**: Check in before starting implementation
3. **Track Progress**: Mark items complete as you go
4. **Explain Changes**: High-level summary at each step
5. **Document Results**: Add review section to `tasks/todo.md`
6. **Capture Lessons**: Update `tasks/lessons.md` after every correction

## Core Principles

- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards only.
- **Minimal Impact**: Changes should only touch what is necessary. Avoid introducing bugs.


---

## The Compounding Effect

Most people use Claude Code the same way every single day and wonder why they keep hitting the same errors.

This system fixes that.

Every correction you make gets captured as a rule. Claude learns your patterns, your preferences, your standards. Over time the mistake rate drops because it is literally learning from your feedback session after session.

If you build with AI daily, drop this `CLAUDE.md` into your next project and watch the difference by day three.

The engineers who figure out how to configure their AI tools properly are going to pull so far ahead of everyone else it won't be close.