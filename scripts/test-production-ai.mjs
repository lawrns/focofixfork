// Test the production AI API with proper authentication
async function testProductionAI() {
  console.log('Testing production AI API...')
  
  // First, let's get a valid session by logging in
  const loginResponse = await fetch('https://foco.mx/api/auth/signin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'laurence@fyves.com',
      password: 'test123' // This won't work without real password
    })
  })
  
  // Instead, let's test the API directly with a mock request
  // to see what the actual error is
  const testResponse = await fetch('https://foco.mx/api/debug-ai', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      // We need actual auth cookies for this to work
    },
    body: JSON.stringify({
      action: 'suggest_subtasks',
      task_id: '8e20cc6c-eb78-4bcb-821a-9ce120bf61df',
      workspace_id: 'd7de1d3e-cae6-4210-ae4e-775fb84ddb7d'
    })
  })
  
  const text = await testResponse.text()
  console.log('Response:', text)
}

testProductionAI().catch(console.error)
