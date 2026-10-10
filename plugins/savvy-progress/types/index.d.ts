export type Phase = 'plan' | 'design' | 'delegate' | 'review' | 'close'

export type PlannedTask = {
  title: string
  tier: string
  after: number[]
}

export type Flow = {
  title: string
  total: number
  done: number
  running: number
  phase: Phase
  isFinished: boolean
  tasks: PlannedTask[]
}

export type AgentStatus = 'running' | 'done' | 'failed'

export type AgentRun = {
  id: string
  agentId?: string
  type: string
  description: string
  model: string
  effort?: string
  status: AgentStatus
  startedAt: number
  endedAt?: number
  contextTokens: number
  contextMax: number
  tokens: number
  costUsd: number
  steps: number
  round: number
  /** Self-reported by the worker through the `step` tool. */
  stepDone?: number
  stepTotal?: number
  stepNote?: string
}

export type Main = {
  model: string
  effort?: string
  status: 'working' | 'idle'
  sessionStartedAt: number
  turnStartedAt?: number
  lastTurnMs?: number
  /** Model requests in the current turn. */
  requests: number
  /** The tool now being called, or 'thinking' or 'writing'. */
  activity: string
  contextTokens?: number
  contextWindow?: number
  contextPercent?: number
  tokens: number
  costUsd: number
  /** The session total from the engine, subagents included. */
  sessionCostUsd?: number
  /** Self-reported by the main agent through the `step` tool. */
  stepDone?: number
  stepTotal?: number
  stepNote?: string
}

export type Advisor = {
  calls: number
  status: 'idle' | 'consulting'
  startedAt?: number
  lastMs?: number
  channel?: 'tool.call' | 'stream' | 'result'
}

export type Panel = {
  isCompact: boolean
  isDoneCollapsed: boolean
  autoOpenedFor: string
}

declare module 'claude-code' {
  interface PluginState {
    'savvy-progress': {
      flow: Flow | null
      agents: AgentRun[]
      panel: Panel
      now: number
      main: Main
      advisor: Advisor
    }
  }
}
