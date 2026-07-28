/**
 * Parameter compatibility for OpenAI chat models.
 *
 * GPT-5-family (reasoning) models reject `max_tokens`, `temperature`
 * and the penalty params; they take `max_completion_tokens` (which must
 * also cover hidden reasoning tokens) and `reasoning_effort`.
 * Legacy 4o-family models keep the classic sampling params.
 * Centralised here so every call site stays model-agnostic and models
 * remain swappable via env without code edits.
 */

export function isReasoningModel(model: string): boolean {
  return /^(gpt-5|o\d)/.test(model);
}

// Hidden-reasoning headroom on top of the visible-output budget, scaled by
// effort so raising AXEL_REASONING_EFFORT can never silently truncate the
// visible answer. Measured on gpt-5.6-sol at "low": 50–150 reasoning tokens
// for conversational work.
const REASONING_HEADROOM: Record<string, number> = {
  minimal: 500,
  low: 1500,
  medium: 3000,
  high: 6000,
};

export interface TuningOpts {
  maxTokens: number;
  temperature?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
  reasoningEffort?: 'minimal' | 'low' | 'medium' | 'high';
}

export function tuningParams(model: string, opts: TuningOpts): Record<string, unknown> {
  if (isReasoningModel(model)) {
    const effort = opts.reasoningEffort ?? 'low';
    return {
      max_completion_tokens: opts.maxTokens + (REASONING_HEADROOM[effort] ?? 1500),
      reasoning_effort: effort,
    };
  }
  const p: Record<string, unknown> = { max_tokens: opts.maxTokens };
  if (opts.temperature !== undefined) p.temperature = opts.temperature;
  if (opts.presencePenalty !== undefined) p.presence_penalty = opts.presencePenalty;
  if (opts.frequencyPenalty !== undefined) p.frequency_penalty = opts.frequencyPenalty;
  return p;
}
