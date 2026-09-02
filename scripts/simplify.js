import fs from 'fs';
import simplify from '@turf/simplify';
const raw = JSON.parse(fs.readFileSync('public/india-districts.json', 'utf8'));
const options = {tolerance: 0.01, highQuality: false, mutate: true};
const simplified = simplify(raw, options);
fs.writeFileSync('public/india-districts.json', JSON.stringify(simplified));
