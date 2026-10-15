import { readdir, readFile, writeFile } from 'node:fs/promises';
import { deflateRawSync } from 'node:zlib';
const dist = new URL('../dist/', import.meta.url);
async function inventory(dir, prefix = '') {
  const list = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (e.isDirectory())
      list.push(...(await inventory(new URL(e.name + '/', dir), prefix + e.name + '/')));
    else if (!e.name.endsWith('.zip')) list.push(prefix + e.name);
  }
  return list.sort();
}
function crc32(data) {
  let c = -1;
  for (const b of data) {
    c ^= b;
    for (let i = 0; i < 8; i++) c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
  }
  return (c ^ -1) >>> 0;
}
const local = [],
  central = [];
let offset = 0;
const files = await inventory(dist);
for (const file of files) {
  const name = Buffer.from(file),
    data = await readFile(new URL(file, dist)),
    compressed = deflateRawSync(data),
    crc = crc32(data);
  const h = Buffer.alloc(30);
  h.writeUInt32LE(0x04034b50);
  h.writeUInt16LE(20, 4);
  h.writeUInt16LE(0x800, 6);
  h.writeUInt16LE(8, 8);
  h.writeUInt16LE(33, 12);
  h.writeUInt32LE(crc, 14);
  h.writeUInt32LE(compressed.length, 18);
  h.writeUInt32LE(data.length, 22);
  h.writeUInt16LE(name.length, 26);
  const c = Buffer.alloc(46);
  c.writeUInt32LE(0x02014b50);
  c.writeUInt16LE(20, 4);
  c.writeUInt16LE(20, 6);
  c.writeUInt16LE(0x800, 8);
  c.writeUInt16LE(8, 10);
  c.writeUInt16LE(33, 14);
  c.writeUInt32LE(crc, 16);
  c.writeUInt32LE(compressed.length, 20);
  c.writeUInt32LE(data.length, 24);
  c.writeUInt16LE(name.length, 28);
  c.writeUInt32LE(offset, 42);
  local.push(h, name, compressed);
  central.push(c, name);
  offset += h.length + name.length + compressed.length;
}
const directory = Buffer.concat(central),
  end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50);
end.writeUInt16LE(files.length, 8);
end.writeUInt16LE(files.length, 10);
end.writeUInt32LE(directory.length, 12);
end.writeUInt32LE(offset, 16);
await writeFile(new URL('Fake-Filler-Dev.zip', dist), Buffer.concat([...local, directory, end]));
console.log(`dist/Fake-Filler-Dev.zip (${files.length} files)`);
