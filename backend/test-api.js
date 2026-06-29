
// Test creating a share
const testCreateShare = async () => {
  try {
    const res = await fetch('http://localhost:3001/api/shares', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: {
          settings: { sound: { enabled: true } },
          games: [{ id: '1', name: 'Test Game' }]
        }
      })
    });
    const data = await res.json();
    console.log('✅ Share created:', data);
    return data.id;
  } catch (err) {
    console.error('❌ Error creating share:', err);
  }
};

// Test getting a share
const testGetShare = async (id) => {
  try {
    const res = await fetch(`http://localhost:3001/api/shares/${id}`);
    const data = await res.json();
    console.log('✅ Share retrieved:', data);
  } catch (err) {
    console.error('❌ Error getting share:', err);
  }
};

// Run tests
(async () => {
  const shareId = await testCreateShare();
  if (shareId) await testGetShare(shareId);
})();
