/**
 * Regenerates the geotagged e2e image fixture.
 *
 *   node tools/generate-geotagged-fixture.mjs
 *
 * The e2e suite needs a photo whose EXIF carries a GPS position, so the
 * "From photo" position source is reachable from a test. The plain fixture
 * (`bite.jpg`) deliberately has no EXIF at all, so it stays the fixture for
 * every flow that must NOT resolve a photo position.
 *
 * The coordinates are written as whole degrees/minutes/seconds and chosen so
 * that the decimal degrees `exifr` derives from them are exactly representable
 * as doubles (41 + 52/60 + 30/3600 = 41.875, 12 + 22/60 + 30/3600 = 12.375).
 * That is what lets the test assert the persisted position with an equality
 * check instead of a tolerance. They are also nowhere near the browser
 * geolocation pinned in `playwright.config.ts`, so an assertion on them cannot
 * pass off the device fix as the photo position.
 *
 * Written by hand rather than through an image library because the EXIF block
 * has to be byte-for-byte stable: the fixture is committed, and a regenerated
 * file that differs only in encoder metadata is noise in every diff.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const FIXTURES = join(
  import.meta.dirname,
  '..',
  'apps',
  'bite-tribe-e2e',
  'src',
  'fixtures',
);
const SOURCE = join(FIXTURES, 'bite.jpg');
const TARGET = join(FIXTURES, 'bite-geotagged.jpg');

/** 41°52'30"N, 12°22'30"E — 41.875 / 12.375 in decimal degrees. */
const LATITUDE = { ref: 'N', dms: [41, 52, 30] };
const LONGITUDE = { ref: 'E', dms: [12, 22, 30] };

// Offsets into the TIFF block, which is what EXIF pointers are relative to.
const IFD0_OFFSET = 8;
const GPS_IFD_OFFSET = 26; // after the 8-byte header and a 1-entry IFD0
const LATITUDE_OFFSET = 92; // after the 5-entry GPS IFD
const LONGITUDE_OFFSET = 116;
const TIFF_LENGTH = 140;

const TAG = {
  gpsIfdPointer: 0x8825,
  versionId: 0x0000,
  latitudeRef: 0x0001,
  latitude: 0x0002,
  longitudeRef: 0x0003,
  longitude: 0x0004,
};

const TYPE = { byte: 1, ascii: 2, long: 4, rational: 5 };

const buildTiff = () => {
  const tiff = Buffer.alloc(TIFF_LENGTH);

  // Little-endian TIFF header pointing at IFD0.
  tiff.write('II', 0, 'ascii');
  tiff.writeUInt16LE(0x002a, 2);
  tiff.writeUInt32LE(IFD0_OFFSET, 4);

  // IFD0: nothing but the pointer to the GPS IFD, and no next IFD.
  tiff.writeUInt16LE(1, IFD0_OFFSET);
  writeEntry(tiff, IFD0_OFFSET + 2, TAG.gpsIfdPointer, TYPE.long, 1, (at) =>
    tiff.writeUInt32LE(GPS_IFD_OFFSET, at),
  );
  tiff.writeUInt32LE(0, IFD0_OFFSET + 14);

  tiff.writeUInt16LE(5, GPS_IFD_OFFSET);
  let entry = GPS_IFD_OFFSET + 2;

  // GPSVersionID 2.3.0.0 — four bytes, so it fits in the value field itself.
  entry = writeEntry(tiff, entry, TAG.versionId, TYPE.byte, 4, (at) =>
    Buffer.from([2, 3, 0, 0]).copy(tiff, at),
  );
  entry = writeEntry(tiff, entry, TAG.latitudeRef, TYPE.ascii, 2, (at) =>
    tiff.write(`${LATITUDE.ref}\0`, at, 'ascii'),
  );
  // Three rationals are 24 bytes, so these carry an offset instead of a value.
  entry = writeEntry(tiff, entry, TAG.latitude, TYPE.rational, 3, (at) =>
    tiff.writeUInt32LE(LATITUDE_OFFSET, at),
  );
  entry = writeEntry(tiff, entry, TAG.longitudeRef, TYPE.ascii, 2, (at) =>
    tiff.write(`${LONGITUDE.ref}\0`, at, 'ascii'),
  );
  entry = writeEntry(tiff, entry, TAG.longitude, TYPE.rational, 3, (at) =>
    tiff.writeUInt32LE(LONGITUDE_OFFSET, at),
  );
  tiff.writeUInt32LE(0, entry);

  writeDms(tiff, LATITUDE_OFFSET, LATITUDE.dms);
  writeDms(tiff, LONGITUDE_OFFSET, LONGITUDE.dms);

  return tiff;
};

/** One 12-byte IFD entry; `writeValue` fills its 4-byte value field. */
const writeEntry = (tiff, at, tag, type, count, writeValue) => {
  tiff.writeUInt16LE(tag, at);
  tiff.writeUInt16LE(type, at + 2);
  tiff.writeUInt32LE(count, at + 4);
  writeValue(at + 8);
  return at + 12;
};

/** Degrees, minutes and seconds as three unsigned rationals over 1. */
const writeDms = (tiff, at, dms) =>
  dms.forEach((part, index) => {
    tiff.writeUInt32LE(part, at + index * 8);
    tiff.writeUInt32LE(1, at + index * 8 + 4);
  });

const buildApp1 = () => {
  const header = Buffer.from('Exif\0\0', 'ascii');
  const tiff = buildTiff();
  const marker = Buffer.alloc(4);

  marker.writeUInt16BE(0xffe1, 0);
  // The length field covers itself but not the marker.
  marker.writeUInt16BE(2 + header.length + tiff.length, 2);

  return Buffer.concat([marker, header, tiff]);
};

const source = readFileSync(SOURCE);

if (source.readUInt16BE(0) !== 0xffd8) {
  throw new Error(`${SOURCE} is not a JPEG: it does not start with SOI.`);
}

// Straight after SOI, which is where a reader expects Exif to be.
const geotagged = Buffer.concat([
  source.subarray(0, 2),
  buildApp1(),
  source.subarray(2),
]);

writeFileSync(TARGET, geotagged);

console.log(
  `Wrote ${TARGET} (${geotagged.length} bytes) at ` +
    `${LATITUDE.dms.join('/')}${LATITUDE.ref} ${LONGITUDE.dms.join('/')}${LONGITUDE.ref}.`,
);
