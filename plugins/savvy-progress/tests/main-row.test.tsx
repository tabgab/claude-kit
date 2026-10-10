import { expect, mock, test } from 'claude-code/testing'

const PANE = {
  plugin: 'savvy-progress',
  component: 'Pane',
  requestId: 'savvy-agents',
  surface: 'terminal',
  viewport: { columns: 100, rows: 30 },
  props: {
    title: 'Agents',
    isFocused: true,
    bodyColumns: 80,
    placement: 'inline',
    scroll: { offset: 0, bodyRows: 20 },
    view: {},
  },
} as const

const MODEL = 'claude-opus-4-7'
const usage = (input: number, output: number) => ({
  model: MODEL,
  input_tokens: input,
  output_tokens: output,
  cache_read_input_tokens: 0,
  cache_creation_input_tokens: 0,
})

// Fires one model request and reads the stream to its end.
async function step($: any, input: Record<string, unknown>) {
  const stream = $.turn.step({ turnId: 't1', model: MODEL, messageCount: 1, ...input })
  let r = await stream.next()
  while (r.done !== true) r = await stream.next()
  return r.value
}

function stubs(on: any, serverToolUses?: unknown[]) {
  mock.clock(on)
  on('turn.start', ($: any, e: any) => ({ turnId: e.turnId }))
  on('turn.complete', () => ({ text: '' }))
  on('tool.call', () => ({ result: 'ran' }))
  on('turn.step', async function* ($: any, e: any) {
    yield { kind: 'thinking', index: 0, text: 'hm' }
    yield { kind: 'tool', index: 1, id: 'u1', name: 'Read' }
    const n = e.agentId ? 100 : e.index + 1
    return { turnId: e.turnId, index: e.index, answer: 'ok', toolUses: [], serverToolUses, stopReason: 'end_turn', usage: usage(1000 * n, 100 * n) }
  })
}

test('a main turn updates requests, tokens, cost and status', async ($, on) => {
  stubs(on)
  await $.turn.start({ turnId: 't1', text: 'hello' })
  await step($, { index: 0 })
  await step($, { index: 1 })

  let ui = await $.ui.mount(PANE)
  // 1100 + 2200 tokens at the Opus price: about two cents
  expect(await ui.find({ type: 'Text', text: /working/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /2 req/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /≈\$0\.02/ })).toBeDefined()
  await ui.unmount()

  await $.turn.complete({ turnId: 't1', answer: 'ok', durationMs: 5000, isAborted: false, usage: null })
  ui = await $.ui.mount(PANE)
  expect(await ui.find({ type: 'Text', text: /idle/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /0:05$/ })).toBeDefined()
})

test('the step tool without agentId sets the main steps', async ($, on) => {
  stubs(on)
  await $.turn.start({ turnId: 't1', text: 'hello' })
  const out = await $.tool.call({ tool: 'mcp__savvy-progress__step', done: 1, total: 4, note: 'second thing' })
  expect(out).toEqual({ result: 'ok' })

  const ui = await $.ui.mount(PANE)
  expect(await ui.find({ type: 'Text', text: /1\/4 · second thing/ })).toBeDefined()
})

test('an advisor in the step result counts once, with its time', async ($, on) => {
  stubs(on, [{ id: 's1', name: 'advisor', input: {}, startedAt: 1000, endedAt: 4000 }])
  await $.turn.start({ turnId: 't1', text: 'hello' })
  await step($, { index: 0 })
  await step($, { index: 1 })

  const diag = await $.command.run({ command: 'savvy-diag', args: '' })
  expect(diag.text).toContain('advisor: 1 calls, idle, channel result, last 3000 ms')
  const ui = await $.ui.mount(PANE)
  expect(await ui.find({ type: 'Text', text: 'Advisor' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /1 calls · idle · last 0:03/ })).toBeDefined()
})

test('a subagent step updates its row and leaves the main row alone', async ($, on) => {
  stubs(on)
  on('agent.spawn', () => ({ agentId: 'ag1', model: MODEL }))
  await $.agent.spawn({ subagentType: 'Explore', description: 'Look around', tool_use_id: 'tu9' })
  await step($, { index: 0, agentId: 'ag1' })

  const ui = await $.ui.mount(PANE)
  expect(await ui.find({ type: 'Text', text: 'Look around' })).toBeDefined()
  // 110000 tokens on the subagent: the main row shows no requests and no cost
  expect(await ui.find({ type: 'Text', text: /110k tokens/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /ctx 0% · 0 ≈\$0\.00/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /0 req/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /idle/ })).toBeDefined()
})

test('the pane draws a Main row in the terminal, with no subagents', async ($, on) => {
  stubs(on)
  const ui = await $.ui.mount(PANE)
  expect(await ui.find({ type: 'Text', text: 'Main' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: 'No subagents yet.' })).toBeDefined()
})

test('the desktop pane draws the main and advisor rows', async ($, on) => {
  stubs(on, [{ id: 's1', name: 'advisor', input: {}, startedAt: 1000, endedAt: 4000 }])
  await $.turn.start({ turnId: 't1', text: 'hello' })
  await step($, { index: 0 })
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  const alts = (await ui.findAll({ type: 'Svg' })).map(svg => String(svg.props.alt))
  expect(alts.some(alt => alt.startsWith('Main:'))).toBe(true)
  expect(alts).toContain('Advisor: 1 calls · idle · last 0:03')
})

test('session.start registers /savvy-diag and opens the pane once', async ($, on) => {
  mock.clock(on)
  const opened: unknown[] = []
  on('session.start', () => ({ cwd: '/work' }))
  on('tool.register', () => ({ value: undefined }))
  on('command.register', () => ({ value: undefined }))
  on('settings.read', () => ({ value: {} }))
  on('env.get', () => ({ value: undefined }))
  on('session.model', () => ({ value: MODEL }))
  on('session.usage', () => ({ value: { context: { tokens: 5000, window: 1000000, percent: 1 }, rateLimits: [], cost: { usd: 1.5 } } }))
  on('ui.panes', () => ({ value: [] }))
  on('ui.open', (_$: any, e: any) => (opened.push(e), { value: { isPlaced: true } }))
  await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' })
  expect(opened.length).toBe(1)
  const ui = await $.ui.mount(PANE)
  expect(await ui.find({ type: 'Text', text: /session \$1\.50/ })).toBeDefined()
})
