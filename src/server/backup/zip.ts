import { inflateRawSync } from 'node:zlib';
import * as archiverModule from 'archiver';

export function createZipArchive(level = 9): archiverModule.Archiver {
  const mod = archiverModule as unknown as Record<string, unknown>;
  if (typeof mod.ZipArchive === 'function') {
    const ZipCtor = mod.ZipArchive as new (opts: {
      zlib: { level: number };
    }) => archiverModule.Archiver;
    return new ZipCtor({ zlib: { level } });
  }
  const fn =
    typeof archiverModule === 'function'
      ? (archiverModule as unknown as (
          fmt: string,
          opts: { zlib: { level: number } }
        ) => archiverModule.Archiver)
      : (mod.default as (
          fmt: string,
          opts: { zlib: { level: number } }
        ) => archiverModule.Archiver);
  return fn('zip', { zlib: { level } });
}

export type ZipEntry = {
  name: string;
  compressionMethod: number;
  compressedSize: number;
  uncompressedSize: number;
  localHeaderOffset: number;
};

const EOCD_SIG = 0x06054b50;
const CEN_SIG = 0x02014b50;
const LOC_SIG = 0x04034b50;

/**
 * Pure-Node ZIP Central Directory reader.
 * Works with `archiver`-generated archives (including data descriptors).
 */
export function readZipIndex(zipBuffer: Buffer): Map<string, ZipEntry> {
  const minOffset = Math.max(0, zipBuffer.length - 65557);
  let eocdOffset = -1;
  for (let i = zipBuffer.length - 22; i >= minOffset; i--) {
    if (zipBuffer.readUInt32LE(i) === EOCD_SIG) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset === -1) {
    throw new Error('Invalid zip archive: End of Central Directory not found.');
  }

  const totalEntries = zipBuffer.readUInt16LE(eocdOffset + 10);
  const centralDirOffset = zipBuffer.readUInt32LE(eocdOffset + 16);

  const entries = new Map<string, ZipEntry>();
  let pos = centralDirOffset;

  for (let i = 0; i < totalEntries; i++) {
    if (pos + 46 > zipBuffer.length || zipBuffer.readUInt32LE(pos) !== CEN_SIG) {
      throw new Error('Invalid zip archive: corrupt central directory.');
    }
    const compressionMethod = zipBuffer.readUInt16LE(pos + 10);
    const compressedSize = zipBuffer.readUInt32LE(pos + 20);
    const uncompressedSize = zipBuffer.readUInt32LE(pos + 24);
    const nameLen = zipBuffer.readUInt16LE(pos + 28);
    const extraLen = zipBuffer.readUInt16LE(pos + 30);
    const commentLen = zipBuffer.readUInt16LE(pos + 32);
    const localHeaderOffset = zipBuffer.readUInt32LE(pos + 42);

    const name = zipBuffer.toString('utf8', pos + 46, pos + 46 + nameLen);
    pos += 46 + nameLen + extraLen + commentLen;

    // Reject path traversal or directory entries
    if (
      !name ||
      name.endsWith('/') ||
      name.startsWith('/') ||
      name.includes('..')
    ) {
      continue;
    }

    entries.set(name, {
      name,
      compressionMethod,
      compressedSize,
      uncompressedSize,
      localHeaderOffset,
    });
  }

  return entries;
}

export function readZipEntry(zipBuffer: Buffer, entry: ZipEntry): Buffer {
  const offset = entry.localHeaderOffset;
  if (offset + 30 > zipBuffer.length || zipBuffer.readUInt32LE(offset) !== LOC_SIG) {
    throw new Error(`Invalid zip local header for ${entry.name}`);
  }
  const nameLen = zipBuffer.readUInt16LE(offset + 26);
  const extraLen = zipBuffer.readUInt16LE(offset + 28);
  const dataStart = offset + 30 + nameLen + extraLen;
  const dataEnd = dataStart + entry.compressedSize;
  if (dataEnd > zipBuffer.length) {
    throw new Error(`Truncated zip entry: ${entry.name}`);
  }
  const slice = zipBuffer.subarray(dataStart, dataEnd);
  if (entry.compressionMethod === 0) {
    return Buffer.from(slice);
  }
  if (entry.compressionMethod === 8) {
    return inflateRawSync(slice);
  }
  throw new Error(
    `Unsupported zip compression method ${entry.compressionMethod} for ${entry.name}`
  );
}
