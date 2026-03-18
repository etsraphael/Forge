const VALID_ACTIONS = ["create_task", "update_task", "delete_task"];

const ACTION_BLOCK_REGEX = /~~~forge-action\s*\n([\s\S]*?)\n~~~/g;

/**
 * Parse forge-action blocks from AI response text.
 * @param {string} responseText - Full AI response
 * @returns {{ actions: object[], cleanContent: string }}
 */
export function parseActions(responseText) {
  const actions = [];
  const cleanContent = responseText.replace(ACTION_BLOCK_REGEX, (_, json) => {
    try {
      const parsed = JSON.parse(json.trim());
      if (parsed.action && VALID_ACTIONS.includes(parsed.action)) {
        actions.push(parsed);
      }
    } catch {
      // Skip malformed JSON
    }
    return "";
  }).trim();

  return { actions, cleanContent };
}
