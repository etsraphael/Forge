const VALID_ACTIONS = ['create_task', 'update_task', 'delete_task']

const ACTION_BLOCK_REGEX = /~~~forge-action\s*\n([\s\S]*?)\n?~~~/g

/**
 * Parse the first valid forge-action block from AI response text.
 * Subsequent action blocks are stripped from content but not executed.
 * @param {string} responseText - Full AI response
 * @returns {{ actions: object[], cleanContent: string }}
 */
export function parseActions(responseText) {
  let firstAction = null
  const cleanContent = responseText
    .replace(ACTION_BLOCK_REGEX, (_, json) => {
      if (firstAction) return ''
      try {
        const parsed = JSON.parse(json.trim())
        if (parsed.action && VALID_ACTIONS.includes(parsed.action)) {
          firstAction = parsed
        }
      } catch {
        // Skip malformed JSON
      }
      return ''
    })
    .trim()

  return { actions: firstAction ? [firstAction] : [], cleanContent }
}
