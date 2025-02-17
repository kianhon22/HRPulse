
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

// Android emulators cannot access localhost from the computer.
const SUPABASE_URL = 'http://10.0.2.2:8000'; // Change if running Supabase locally