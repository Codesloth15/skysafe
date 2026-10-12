import { parse } from 'csv-parse/sync';
import { mkdir, writeFile, rename, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import {
  normalizeOurAirports,
  validateAirportDataset,
  airportSchema,
} from '../src/infrastructure/adapters/airports.ts';
import { deduplicateAirports } from '../src/domain/services/geography.ts';
const directory = fileURLToPath(new URL('../public/data/', import.meta.url));
const output = fileURLToPath(
  new URL('../public/data/airports.json', import.meta.url),
);
try {
  const response = await fetch(
    'https://davidmegginson.github.io/ourairports-data/airports.csv',
    { signal: AbortSignal.timeout(60000) },
  );
  if (!response.ok)
    throw new Error('OurAirports returned HTTP ' + response.status);
  const rows = parse(await response.text(), {
    columns: true,
    skip_empty_lines: true,
    bom: true,
  });
  const at = new Date().toISOString();
  const airports = normalizeOurAirports(rows, at);
  if (!airports.length)
    throw new Error(
      'No valid Philippine airports found; previous data was preserved.',
    );
  const sources = [
    {
      name: 'OurAirports',
      url: 'https://ourairports.com/data/',
      attribution: 'OurAirports · public domain airport reference data',
      importedAt: at,
      status: 'available',
      message:
        'Airport locations only. Not authoritative drone airspace boundaries.',
    },
  ];
  // Optional prepared OSM supplement, never a recurring national browser request.
  let supplement = [];
  try {
    const input = JSON.parse(
      await readFile(
        new URL('../public/data/osm-airports.json', import.meta.url),
        'utf8',
      ),
    );
    supplement = input.airports.map((a) => airportSchema.parse(a));
    if (supplement.length)
      sources.push({
        name: 'OpenStreetMap contributors',
        url: 'https://www.openstreetmap.org/copyright',
        attribution: '© OpenStreetMap contributors · ODbL',
        importedAt: input.importedAt,
        status: 'available',
        message:
          'Prepared OSM airport/heliport supplement; completeness is not guaranteed.',
      });
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const dataset = validateAirportDataset({
    airports: deduplicateAirports([...airports, ...supplement]),
    sources,
    importedAt: at,
  });
  await mkdir(directory, { recursive: true });
  await writeFile(output + '.tmp', JSON.stringify(dataset, null, 2));
  await rename(output + '.tmp', output);
  console.log(
    'Prepared ' +
      dataset.airports.length +
      ' real Philippine airports and heliports at ' +
      at +
      '.',
  );
} catch (error) {
  console.error(
    'Airport preparation failed. Existing data was left unchanged:',
    error.message,
  );
  process.exitCode = 1;
}
