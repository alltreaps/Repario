// Test file to verify Supabase connection
// This file can be deleted once integration is complete

import { supabase } from '../lib/supabase'
import { getCurrentUser, fetchLayouts } from '../lib/api'

export const testSupabaseConnection = async () => {
  try {
    console.log('Testing Supabase connection...')
    
    // Test basic connection
    const { error } = await supabase.from('profiles').select('count(*)').limit(1)
    if (error) {
      console.error('Supabase connection error:', error.message)
      return false
    }
    
    console.log('✅ Supabase connection successful')
    
    // Test authentication status
    try {
      const user = await getCurrentUser()
      if (user) {
        console.log('✅ User authenticated:', user.email)
        
        // Test API function
        const layouts = await fetchLayouts()
        console.log('✅ Layouts fetched:', layouts.length, 'layouts found')
      } else {
        console.log('ℹ️ No user currently authenticated')
      }
    } catch (authError) {
      console.log('ℹ️ Authentication test failed (expected if not logged in):', authError)
    }
    
    return true
  } catch (error) {
    console.error('❌ Supabase test failed:', error)
    return false
  }
}

// Auto-run test in development
if (import.meta.env.DEV) {
  testSupabaseConnection()
}
