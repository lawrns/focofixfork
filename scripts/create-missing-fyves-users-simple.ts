import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://czijxfbkihrauyjwcgfn.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6aWp4ZmJraWhyYXV5andjZ2ZuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjE3NTk4MywiZXhwIjoyMDY3NzUxOTgzfQ._JnBgXZLk23daPdnCUksfvooIJk2r9mEyclO8MnvfQ8'

const supabase = createClient(supabaseUrl, supabaseKey)

const MISSING_USERS = [
  { email: 'isaac@fyves.com', name: 'Isaac Fyves', password: 'hennie12' },
  { email: 'jose@fyves.com', name: 'Jose Fyves', password: 'hennie12' },
  { email: 'paul@fyves.com', name: 'Paul Fyves', password: 'hennie12' },
  { email: 'oscar@fyves.com', name: 'Oscar Fyves', password: 'hennie12' }
]

async function createUsers() {
  console.log('👤 Creating missing Fyves users...\n')

  for (const user of MISSING_USERS) {
    console.log(`Creating ${user.email}...`)

    try {
      // Use admin.createUser with explicit options
      const { data, error } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true, // Skip email verification
        user_metadata: {
          full_name: user.name,
          display_name: user.name
        }
      })

      if (error) {
        console.error(`  ❌ Error: ${error.message}`)
        console.error(`  Details:`, error)

        // Try alternative approach - signUp
        console.log(`  🔄 Trying alternative method...`)

        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: user.email,
          password: user.password,
          options: {
            data: {
              full_name: user.name,
              display_name: user.name
            }
          }
        })

        if (signUpError) {
          console.error(`  ❌ Alternative failed: ${signUpError.message}`)
        } else {
          console.log(`  ✅ Created via signUp`)

          if (signUpData.user) {
            // Create profile
            await supabase
              .from('user_profiles')
              .upsert({
                id: signUpData.user.id,
                user_id: signUpData.user.id,
                display_name: user.name,
                email_notifications: true
              })
          }
        }
        continue
      }

      console.log(`  ✅ Created successfully`)
      console.log(`  ID: ${data.user?.id}`)

      // Create user profile
      if (data.user) {
        const { error: profileError } = await supabase
          .from('user_profiles')
          .upsert({
            id: data.user.id,
            user_id: data.user.id,
            display_name: user.name,
            email_notifications: true,
            theme_preference: 'light'
          })

        if (profileError) {
          console.log(`  ⚠️ Profile creation failed: ${profileError.message}`)
        } else {
          console.log(`  👤 Profile created`)
        }
      }

    } catch (err: any) {
      console.error(`  ❌ Exception: ${err.message}`)
    }

    console.log()
  }

  console.log('✨ User creation complete!')
  console.log('\nNow run: npx tsx scripts/create-fyves-complete-setup.ts')
}

createUsers()
