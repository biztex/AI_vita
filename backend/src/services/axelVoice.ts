/**
 * Voice transcription for AXEL (2026-08-10, client spec 3).
 *
 * LINE audio message → text, via OpenAI speech-to-text. The transcript is then
 * routed through the normal text engine, so voice consultations get the full
 * treatment (understanding document, web search, deep-proposal mode) and the
 * reply comes back as natural text — exactly what the client asked for
 * (「音声内容を正しく認識し、相談内容として処理」「回答は自然な文章で返信」).
 *
 * Fully fail-safe: returns null on any error, and the caller asks the user to
 * resend or type instead — never a hallucinated transcript.
 */

import OpenAI, { toFile } from 'openai';
import { ENV } from '../env';

const client = new OpenAI({ apiKey: ENV.OPENAI_API_KEY });

/**
 * Transcribe an audio buffer to Japanese text. `filename` should carry the
 * real extension (LINE sends .m4a) so the API detects the format.
 * Returns trimmed text, or null if nothing usable was produced.
 */
// Silence/noise makes transcription models hallucinate a short phrase in a
// random language with LOW token confidence (real speech scores ~-0.0 avg
// logprob; silence ~-2.1). Gate on average logprob so noise is treated as
// unheard regardless of what language it hallucinated — language-agnostic and
// robust, unlike a character-class check.
const MIN_AVG_LOGPROB = -1.2;

export async function transcribeAudio(
  audio: Buffer,
  filename = 'audio.m4a',
): Promise<string | null> {
  try {
    const file = await toFile(audio, filename);
    const res: any = await client.audio.transcriptions.create({
      file,
      model: ENV.AXEL_TRANSCRIBE_MODEL,
      language: 'ja',
      response_format: 'json',
      include: ['logprobs'],
    } as any);
    const text = (res?.text ?? '').trim();
    if (text.length === 0) return null;

    const lps: any[] = Array.isArray(res?.logprobs) ? res.logprobs : [];
    if (lps.length > 0) {
      const avg = lps.reduce((s, t) => s + (t?.logprob ?? 0), 0) / lps.length;
      if (avg < MIN_AVG_LOGPROB) {
        console.log(`[axelVoice] low-confidence transcription (avg logprob ${avg.toFixed(2)}) — treated as unheard`);
        return null;
      }
    }
    return text;
  } catch (err: any) {
    console.error('[axelVoice] transcription failed (non-fatal):', err?.code || err?.message || err);
    return null;
  }
}
