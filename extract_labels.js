const fs = require('fs');
const items = JSON.parse(fs.readFileSync('public/136_items_records.json', 'utf8'));
const labels = [...new Set(items.map(i => i.label))].sort();
fs.writeFileSync('temp_labels.txt', labels.map(l => '  "' + l + '",').join('\n'), 'utf8');
console.log('Total:', labels.length);
