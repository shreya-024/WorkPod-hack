import { HindsightClient } from '@vectorize-io/hindsight-client';

// ─── Hindsight Memory Client ─────────────────────────────────────────────────
// Provides long-term, per-user, per-role memory retention across sessions.
// Uses the `retain` operation to store session summaries and the `recall`
// operation to retrieve relevant past context.
//
// For cloud (Vectorize.io): set HINDSIGHT_BASE_URL and HINDSIGHT_API_KEY.
// For local Docker: set HINDSIGHT_BASE_URL only (defaults to localhost:8888).

const HINDSIGHT_BASE_URL = process.env.HINDSIGHT_BASE_URL || 'http://localhost:8888';
const HINDSIGHT_API_KEY = process.env.HINDSIGHT_API_KEY || '';

let client;
try {
  const clientOpts = { baseUrl: HINDSIGHT_BASE_URL };
  if (HINDSIGHT_API_KEY) {
    clientOpts.apiKey = HINDSIGHT_API_KEY;
  }
  client = new HindsightClient(clientOpts);
  console.log(`[hindsight] Client initialised → ${HINDSIGHT_BASE_URL} (${HINDSIGHT_API_KEY ? 'cloud' : 'local'})`);
} catch (err) {
  console.error('[hindsight] ⚠️  Failed to initialise client:', err.message);
  client = null;
}

// Track which banks we've already created/verified this server lifetime
const knownBanks = new Set();

/**
 * Build a bankId that is unique per user + role combination.
 * This ensures memory is scoped so an SDE session doesn't bleed into HR context.
 *
 * @param {string} mongoUserId - MongoDB ObjectId as string (userId._id.toString())
 * @param {string} role - e.g. 'sde', 'hr', 'pm', 'ml_intern', 'sde_intern'
 * @returns {string} bankId for Hindsight
 */
function buildBankId(mongoUserId, role) {
  return `workpod_${mongoUserId}_${role}`;
}

/**
 * Ensure a memory bank exists on the Hindsight server.
 * Creates it if it doesn't exist yet. Cached in-memory so we only
 * call createBank once per bankId per server lifetime.
 */
async function ensureBank(bankId, role) {
  if (knownBanks.has(bankId)) return;

  try {
    await client.createBank(bankId, {
      name: `WorkPod – ${role.toUpperCase()}`,
      reflectMission: `You are a career growth memory for a WorkPod user in the ${role} role. Remember their session scores, struggles, completed tasks, and feedback to help them improve over time.`,
    });
    console.log(`[hindsight] Bank created/verified → ${bankId}`);
  } catch (err) {
    // 409 = bank already exists — that's fine
    if (err.statusCode === 409) {
      console.log(`[hindsight] Bank already exists → ${bankId}`);
    } else {
      throw err;
    }
  }

  knownBanks.add(bankId);
}

/**
 * Retain a session summary in Hindsight long-term memory.
 * Called after MongoDB save — failures here are logged but never thrown.
 *
 * @param {Object} params
 * @param {string} params.mongoUserId - userId._id.toString()
 * @param {string} params.role
 * @param {Object} params.report - the LLM evaluation report
 * @param {string[]} params.tasksCompleted
 * @param {boolean} params.emergencyTriggered
 * @param {number} params.durationSeconds
 */
export async function retainSessionMemory({
  mongoUserId,
  role,
  report,
  tasksCompleted,
  emergencyTriggered,
  durationSeconds,
}) {
  if (!client) {
    console.warn('[hindsight] Client not initialised — skipping retain');
    return;
  }

  const bankId = buildBankId(mongoUserId, role);

  // Auto-create the bank if it doesn't exist yet
  await ensureBank(bankId, role);

  // Build a human-readable summary that Hindsight can index and recall later
  const feedbackSummary = (report.feedback || []).join(' ');
  const taskList = (tasksCompleted || []).join(', ') || 'none';

  const memoryText = [
    `WorkPod session completed as ${role.toUpperCase()}.`,
    `Duration: ${Math.floor(durationSeconds / 60)} minutes.`,
    `Tasks completed: ${taskList}.`,
    `Emergency handled: ${emergencyTriggered ? 'Yes' : 'No'}.`,
    `Overall score: ${report.overallScore}/100.`,
    `Communication: ${report.communication}/100.`,
    `Task management: ${report.taskManagement}/100.`,
    `Pressure handling: ${report.pressureHandling}/100.`,
    `Feedback: ${feedbackSummary}`,
  ].join(' ');

  await client.retain(bankId, memoryText, {
    metadata: {
      source: 'workpod-session',
      role,
      overallScore: String(report.overallScore),
      timestamp: new Date().toISOString(),
    },
  });

  console.log(`[hindsight] Retained session memory → bank=${bankId}`);
}

/**
 * Recall relevant past memories for a user + role.
 * Useful for injecting historical context into mentor prompts.
 *
 * @param {string} mongoUserId - userId._id.toString()
 * @param {string} role
 * @param {string} query - the current question or context to search against
 * @param {number} [limit=5] - max memories to retrieve
 * @returns {Promise<string[]>} array of memory text strings
 */
export async function recallMemories(mongoUserId, role, query, limit = 5) {
  if (!client) {
    console.warn('[hindsight] Client not initialised — skipping recall');
    return [];
  }

  const bankId = buildBankId(mongoUserId, role);

  // If the bank doesn't exist yet, there's nothing to recall
  try {
    await ensureBank(bankId, role);
  } catch {
    return [];
  }

  const results = await client.recall(bankId, query, { maxTokens: 2000 });

  // Extract the text content from each memory result
  const memories = (results?.results || results?.memories || [])
    .map(m => m.content || m.text || '')
    .filter(Boolean)
    .slice(0, limit);

  console.log(`[hindsight] Recalled ${memories.length} memories from bank=${bankId}`);
  return memories;
}

export { client as hindsightClient };
