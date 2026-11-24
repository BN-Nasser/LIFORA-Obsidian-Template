<%* /* LIFORA templater component - Debug Toggle */ 
// Toggle debug mode
const currentDebugState = localStorage.getItem('timeGardenDebug') === 'true';
const newDebugState = !currentDebugState;

localStorage.setItem('timeGardenDebug', newDebugState.toString());

new Notice(`LIFORA Debug mode ${newDebugState ? 'ENABLED' : 'DISABLED'}`);

// Show current state
console.log(`[LIFORA] Debug mode: ${newDebugState ? 'ENABLED' : 'DISABLED'}`);

if (newDebugState) {
  console.log("[LIFORA] Debug logging active - AI interactions will be logged in full detail");
  console.log("[LIFORA] Open your browser console to see the logs (F12 or Command+Option+I)");
} else {
  console.log("[LIFORA] Debug logging disabled");
}
%>