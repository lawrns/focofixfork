/**
 * Test Supabase Configuration
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function testSupabase() {
  console.log('🔍 Testing Supabase configuration...');
  
  // Check environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  console.log('Environment variables:');
  console.log('SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing');
  console.log('SUPABASE_KEY:', supabaseKey ? 'Set' : 'Missing');
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase environment variables');
    return;
  }
  
  // Create client
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Test connection
  try {
    console.log('\n🧪 Testing Supabase connection...');
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('❌ Supabase connection error:', error.message);
    } else {
      console.log('✅ Supabase connection successful');
      console.log('Current session:', data.session ? 'Active' : 'None');
    }
    
    // Test sign in
    console.log('\n🔐 Testing sign in...');
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'laurence@fyves.com',
      password: 'Hennie@@12'
    });
    
    if (signInError) {
      console.error('❌ Sign in error:', signInError.message);
    } else {
      console.log('✅ Sign in successful');
      console.log('User ID:', signInData.user?.id);
      console.log('Session expires at:', signInData.session?.expires_at);
    }
    
  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

testSupabase();
