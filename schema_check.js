const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim();
fetch(`${url}/rest/v1/?apikey=${key}`).then(r => r.json()).then(data => {
  console.log(Object.keys(data.definitions || data.components?.schemas || {}));
  const schemas = data.definitions || data.components?.schemas || {};
  ['patients', 'appointments', 'event_types', 'psychologists'].forEach(t => {
      console.log(`\nTable ${t}:`);
      if(schemas[t]) console.log(Object.keys(schemas[t].properties).join(', '));
      else console.log('NOT FOUND');
  });
});
