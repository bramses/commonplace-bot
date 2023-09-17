const MAX_CONCURRENT_CALLS = 1;
let currentCalls = 0;
export const queue = [];

function updateQueuePositions() {
  // Iterate over the queue and update each user's position
  console.log("Updating queue positions");
  for (let i = 0; i < queue.length; i++) {
    const { message, interaction } = queue[i];
    console.log(`Updating position for ${interaction.user.id} at ${i}`);
    message.edit(
      `<@${interaction.user.id}>, your request is now #${i + 1} in the queue.`
    );
  }
}

async function processTask(task, user, message, interaction) {
  console.log("Processing task for user", user);
  // Simulate an async task with a delay of 2 seconds
  const results = await task(user, message);
  currentCalls--;
  processQueue();
  updateQueuePositions();
  return results;
}

export function processQueue() {
  console.log("Processing queue");
  console.log("Current calls", currentCalls);
  while (currentCalls < MAX_CONCURRENT_CALLS && queue.length > 0) {
    const { task, user, message, interaction } = queue.shift();
    currentCalls++;
    processTask(task, user, message, interaction);
  }
}