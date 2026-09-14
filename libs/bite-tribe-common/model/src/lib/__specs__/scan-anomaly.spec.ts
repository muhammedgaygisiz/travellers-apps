import {
  DISTANT_SCAN_METERS,
  MIN_SESSIONS_BEFORE_ANOMALY,
  isDistantScan,
  isOpenScanAnomaly,
  isScanAnomalyKind,
  isScanAnomalyStatus,
  manySessionsThreshold,
  scanAnomalyId,
  scanDistanceMeters,
} from '../scan-anomaly';

/**
 * The rules a scan anomaly lives by (GitHub issue #1107).
 *
 * Every one of these is a pure function over numbers and strings, which is the
 * point of them being in the model library at all: the backend raises a row and
 * the business app names one, and the two must not each have their own idea of
 * how far away is far or how many people is too many.
 */
describe('scan anomaly', () => {
  describe('the document name', () => {
    it('is derived from the table and the kind', () => {
      expect(scanAnomalyId('table-12', 'rateLimited')).toBe(
        '8_table-12_rateLimited',
      );
    });

    /**
     * The leading length is what makes the derivation injective. Without it a
     * table called `x_rateLimited` asking to be counted and a table called `x`
     * would name one document, which is two tables sharing a row.
     */
    it('separates two tables whose names run into the kind', () => {
      expect(scanAnomalyId('x_rateLimited', 'disabledTable')).not.toBe(
        scanAnomalyId('x', 'rateLimited'),
      );
    });
  });

  describe('how many sessions are too many', () => {
    it('never falls below the floor, whatever the table seats', () => {
      expect(manySessionsThreshold(2)).toBe(MIN_SESSIONS_BEFORE_ANOMALY);
      expect(manySessionsThreshold(0)).toBe(MIN_SESSIONS_BEFORE_ANOMALY);
    });

    /**
     * A dining room has two-tops and twelve-tops in it, so the threshold is a
     * function of the furniture rather than one number for the restaurant.
     */
    it('follows the capacity of the table once that is the larger number', () => {
      expect(manySessionsThreshold(12)).toBe(12);
    });

    it('treats a missing or nonsensical capacity as no capacity at all', () => {
      expect(manySessionsThreshold(Number.NaN)).toBe(
        MIN_SESSIONS_BEFORE_ANOMALY,
      );
      expect(manySessionsThreshold(-4)).toBe(MIN_SESSIONS_BEFORE_ANOMALY);
    });
  });

  describe('how far away a scan was', () => {
    const RESTAURANT = { latitude: 52.52, longitude: 13.405 };

    it('is nothing at all for a scan on the spot', () => {
      expect(scanDistanceMeters(RESTAURANT, RESTAURANT)).toBeCloseTo(0);
    });

    /**
     * One degree of latitude is about 111 km anywhere on the globe, which is
     * the one distance a spherical model has to get right to be worth using.
     */
    it('measures a degree of latitude as about 111 kilometres', () => {
      const distance = scanDistanceMeters(
        { latitude: 53.52, longitude: 13.405 },
        RESTAURANT,
      );

      expect(distance).toBeGreaterThan(110_000);
      expect(distance).toBeLessThan(112_000);
    });

    it('is symmetric', () => {
      const there = { latitude: 48.137, longitude: 11.575 };

      expect(scanDistanceMeters(there, RESTAURANT)).toBeCloseTo(
        scanDistanceMeters(RESTAURANT, there),
        3,
      );
    });
  });

  describe('whether a position is worth a row', () => {
    it('says nothing about a scan inside the threshold', () => {
      expect(isDistantScan(DISTANT_SCAN_METERS - 1, 20)).toBe(false);
    });

    it('says so about a scan comfortably outside it', () => {
      expect(isDistantScan(4_000, 20)).toBe(true);
    });

    /**
     * A device reporting five kilometres of uncertainty cannot support a claim
     * that anybody is more than five hundred metres away, so it makes none.
     * Discarding coarse fixes at the caller would be the same rule with the
     * reason hidden inside it.
     */
    it('says nothing when the fix is vaguer than the distance it reports', () => {
      expect(isDistantScan(4_000, 5_000)).toBe(false);
    });

    it('treats a missing accuracy as no accuracy claim rather than as zero risk', () => {
      expect(isDistantScan(4_000, Number.NaN)).toBe(true);
    });
  });

  describe('the closed sets', () => {
    it('recognises its own kinds and statuses and nothing else', () => {
      expect(isScanAnomalyKind('manySessions')).toBe(true);
      expect(isScanAnomalyKind('manysessions')).toBe(false);
      expect(isScanAnomalyStatus('dismissed')).toBe(true);
      expect(isScanAnomalyStatus('acknowledged')).toBe(false);
    });

    /**
     * The collection keeps dismissed rows at their derived names rather than
     * deleting them, so "what is in the collection" and "what the floor has not
     * seen" are two different questions and only one of them is drawn.
     */
    it('draws the open rows and not the dismissed ones', () => {
      expect(isOpenScanAnomaly({ status: 'open' })).toBe(true);
      expect(isOpenScanAnomaly({ status: 'dismissed' })).toBe(false);
    });
  });
});
