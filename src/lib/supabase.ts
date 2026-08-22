import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://supa.ayris.tech';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc4NjEyNDEwMCwiZXhwIjo0OTQxNzk3NzAwLCJyb2xlIjoiYW5vbiJ9.WR672lp6I9qqhgB68i6avw__nmG_9EyCE7FbbUfhosg';

export const supabase = createClient(supabaseUrl, supabaseKey);

