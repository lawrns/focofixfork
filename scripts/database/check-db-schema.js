require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function checkSchema() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    console.error('Missing env vars');
    return;
  }

  const supabase = createClient(supabaseUrl, anonKey);

  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .limit(1);

    if (error) {
      console.error('Error:', error);
      return;
    }

    if (data && data.length > 0) {
      console.log('Actual database schema from projects table:');
      Object.keys(data[0]).forEach(key => {
        console.log(`${key}: ${typeof data[0][key]} = ${JSON.stringify(data[0][key])}`);
      });
    } else {
      console.log('No data in projects table');
    }
  } catch (e) {
    console.error('Failed:', e);
  }
}

checkSchema();

