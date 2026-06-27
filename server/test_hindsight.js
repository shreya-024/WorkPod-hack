import dotenv from 'dotenv';
dotenv.config();

const { retainSessionMemory, recallMemories } = await import('./services/hindsightService.js');

async function testHindsight() {
  console.log('--- Testing Hindsight Memory Integration ---');
  
  const testUserId = 'test_user_' + Date.now();
  const role = 'sde_intern';
  
  console.log(`\n1. Retaining memory for user: ${testUserId}, role: ${role}`);
  
  const mockReport = {
    overallScore: 85,
    communication: 90,
    taskManagement: 80,
    pressureHandling: 85,
    feedback: ['Great job communicating blockers.', 'Need to focus more on code formatting.'],
    roadmap: []
  };

  try {
    await retainSessionMemory({
      mongoUserId: testUserId,
      role: role,
      report: mockReport,
      tasksCompleted: ['Setup local environment', 'Fix login bug'],
      emergencyTriggered: true,
      durationSeconds: 1200
    });
    console.log('✅ Retain operation completed (or failed gracefully if server is off).');
  } catch (err) {
    console.error('❌ Retain failed with error:', err);
  }

  // Wait a moment for indexing
  console.log('\nWaiting 2 seconds for indexing...');
  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log(`\n2. Recalling memories for user: ${testUserId}`);
  try {
    const memories = await recallMemories(testUserId, role, 'code formatting', 3);
    console.log(`✅ Recall operation completed. Found ${memories.length} memories.`);
    memories.forEach((mem, i) => console.log(`  [${i+1}] ${mem}`));
  } catch (err) {
    console.error('❌ Recall failed with error:', err);
  }
}

testHindsight().then(() => {
  console.log('\nTest finished.');
  process.exit(0);
});
