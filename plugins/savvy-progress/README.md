# savvy-progress

A Claude Code mod: a progress bar above the prompt and a live panel of subagents. Made for the [savvy-flow](../savvy-flow) skill, and useful with any subagents.

- **Progress bar**: the flow's title, phase, accepted tasks out of planned, and a button with the crew size that opens the panel. It appears once something reports progress (savvy-flow does) or a `savvy-*` worker starts.
- **Agents panel** (`/agents-info` toggles it): running, finished and planned subagents with model, effort, task progress, context, estimated cost and time. Working crabs walk, and each savvy tier animates its prop: the astronaut floats, the detective sweeps the magnifier, the engineer turns the wrench, the chef tosses the omelette, the racer runs with a fluttering flag. `prefers-reduced-motion` stops them.

## Tools it adds

- `mcp__savvy-progress__progress`: the orchestrator reports the plan, phase and accepted tasks.
- `mcp__savvy-progress__step`: a worker reports its own steps (`done`, `total`, `note`). A worker that does not report shows its context fill in grey instead.

Cost is a rough estimate from token counts and a built-in per-model price table (`PRICES` in `hooks/register.tsx`), not a bill.

## Local changes

My own additions on top of the original (version `1.2.0-local.1`):

- **Main row**: the agents panel starts with a "Main" row for the main agent: model and effort, working (with the tool in use, or thinking or writing) or idle, requests this turn, turn time, context fill, and an estimated cost. The context figures come from the engine, not a guess. The header totals include the main agent, and the clock shows the session's time when that is longer.
- **Main self-reported steps**: the `step` tool now also works for the main agent (no `agentId`). It draws a bar in the Main row, and, while the main agent works and no flow is running, in the band above the prompt.
- **Advisor row**: an "Advisor" row appears under Main once the advisor tool has been called: call count, consulting or idle, and the last call's duration. It counts the call from `tool.call` and, as a fallback, from the model's stream.
- **`/savvy-diag`**: lists the tool names seen on the main loop (from `tool.call` and from the stream), the number of opaque engine chunks, and the advisor state. Use it to see which channel the advisor reaches the mod through.
- **Auto-open**: the panel opens by itself when an interactive session starts.

Tests are in `tests/main-row.test.tsx`; run them with `claude plugin test`.

## Settings

`language`: `auto` (default), `en` or `ru`. `auto` follows Claude Code's `language` setting, then the system locale, and falls back to English. Set it in `/config`, or, for a mod loaded by hand, in `~/.claude/settings.json`:

```json
{ "pluginConfigs": { "savvy-progress": { "options": { "language": "ru" } } } }
```

Install instructions are in the [repository README](../../README.md).
