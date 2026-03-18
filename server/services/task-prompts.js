const columnLabels = {
  "in-progress": "In Progress",
  todo: "To Do",
  review: "Review",
  ideas: "Ideas",
  shipped: "Shipped",
};

function taskSummary(task) {
  return (
    `Title: ${task.title}\n` +
    `Type: ${task.type}\n` +
    `Priority: ${task.priority}\n` +
    `Status: ${columnLabels[task.column_id] || task.column_id}\n` +
    (task.description ? `Description: ${task.description}\n` : "")
  );
}

const promptBuilders = {
  subtasks: (task) =>
    `Break the following task into 5–8 specific, actionable subtasks. Be concrete and practical.\n\n${taskSummary(task)}`,

  draft: (task) =>
    `Draft initial content for the following task. Write a clear, professional first draft that addresses the task's goals.\n\n${taskSummary(task)}`,

  research: (task) =>
    `Research and summarize key insights relevant to the following task. Include concrete data points, best practices, or competitive context where applicable.\n\n${taskSummary(task)}`,

  "next-steps": (task) =>
    `Suggest concrete next steps for the following task. Consider dependencies, blockers, and the most impactful actions to take next.\n\n${taskSummary(task)}`,

  code: (task) =>
    `Generate implementation code for the following task. Write clean, well-structured code with brief comments explaining key decisions.\n\n${taskSummary(task)}`,
};

/**
 * Returns a prompt string for the given command and task, or null if the command is unknown.
 */
export function getTaskPrompt(command, task) {
  const builder = promptBuilders[command];
  if (!builder) return null;
  return builder(task);
}
