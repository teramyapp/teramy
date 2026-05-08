
import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://qpfxdiqfhbgocdcxrpxc.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwZnhkaXFmaGJnb2NkY3hycHhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5NDk4MjksImV4cCI6MjA5MzUyNTgyOX0.th69aETRIgtBy8RI2nZp-vPnmegrgadZdO4uVLKVxh0');

async function testQuery() {
  const columns = [
    'id', 'user_id', 'name', 'slug', 'title', 'photo_url', 'timezone', 
    'video_meeting_url', 'session_type', 'whatsapp_reminder_template', 
    'whatsapp_reschedule_template', 'whatsapp_cancel_template'
  ];

  for (const col of columns) {
    const { error } = await supabase.from('psychologists').select(col).limit(1);
    if (error) {
      console.log(`MISSING: ${col} - ${error.message}`);
    } else {
      console.log(`EXISTS: ${col}`);
    }
  }
}

testQuery();
