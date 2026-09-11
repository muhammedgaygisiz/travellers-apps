import { FloorPlanDraft, FloorPlanObject, RestaurantTable, Room } from 'model';
import { FloorPlanLayout } from '../floor-plan-layout';
import {
  changeSummary,
  draftFields,
  draftLayout,
  formFields,
  openingFields,
  openingLayout,
  publishedFields,
  sameFields,
} from '../floor-plan-publish';

const room = (over: Partial<Room> = {}): Room => ({
  id: 'room-1',
  name: 'Main dining room',
  order: 0,
  size: { width: 8000, height: 12_000 },
  objects: [],
  version: 3,
  ...over,
});

const wall: FloorPlanObject = {
  id: 'wall-1',
  type: 'wall',
  position: { x: 1000, y: 1000 },
  size: { width: 2000, height: 100 },
  rotation: 0,
};

const table = (over: Partial<RestaurantTable> = {}): RestaurantTable =>
  ({
    id: 'table-1',
    label: '1',
    roomId: 'room-1',
    shape: 'rectangle',
    size: { width: 1000, height: 1000 },
    position: { x: 2000, y: 2000 },
    rotation: 0,
    seats: 4,
    enabled: true,
    ...over,
  }) as RestaurantTable;

const draft = (over: Partial<FloorPlanDraft> = {}): FloorPlanDraft => ({
  name: 'Terrace',
  size: { width: 6000, height: 6000 },
  objects: [],
  tables: [],
  revision: 2,
  updatedAt: 1_700_000_000_000,
  ...over,
});

const layout = (over: Partial<FloorPlanLayout> = {}): FloorPlanLayout => ({
  objects: [],
  tables: [],
  ...over,
});

describe('the room fields', () => {
  it('reads them off a published room, leaving an unnamed floor absent', () => {
    expect(publishedFields(room())).toEqual({
      name: 'Main dining room',
      size: { width: 8000, height: 12_000 },
    });
    expect(publishedFields(room({ floor: 'Upstairs' })).floor).toBe('Upstairs');
  });

  it('reads them off a draft and off the room form the same way', () => {
    expect(draftFields(draft({ floor: 'Ground floor' })).floor).toBe(
      'Ground floor',
    );
    expect(formFields({ name: 'Bar', width: 4000, height: 5000 })).toEqual({
      name: 'Bar',
      size: { width: 4000, height: 5000 },
    });
  });

  /** An absent floor and an empty one are the same room on no named level,
   * so a comparison that separated them would report a change nobody made. */
  it('treats an absent floor and an empty one as one value', () => {
    expect(
      sameFields(
        { name: 'Bar', size: { width: 1, height: 1 } },
        { name: 'Bar', size: { width: 1, height: 1 }, floor: '' },
      ),
    ).toBe(true);
  });

  it('reports a different name, level or dimension as a difference', () => {
    const base = { name: 'Bar', size: { width: 1000, height: 1000 } };

    expect(sameFields(base, { ...base, name: 'Terrace' })).toBe(false);
    expect(
      sameFields(base, { ...base, size: { width: 1000, height: 2000 } }),
    ).toBe(false);
    expect(sameFields(base, { ...base, floor: 'Upstairs' })).toBe(false);
  });
});

/**
 * The acceptance criterion behind "closing the browser mid-edit and returning
 * restores the draft": what the editor opens on is the draft when there is
 * one, and the published plan when there is not.
 */
describe('what the editor opens on', () => {
  it('opens on the draft when the owner left one', () => {
    const stored = draft({ tables: [table({ label: '9' })] });

    expect(openingLayout(room(), [table()], stored).tables[0].label).toBe('9');
    expect(openingFields(room(), stored).name).toBe('Terrace');
  });

  it('opens on the published plan when there is no draft', () => {
    expect(
      openingLayout(room({ objects: [wall] }), [table()], undefined),
    ).toEqual({
      objects: [wall],
      tables: [table()],
    });
    expect(openingFields(room(), undefined).name).toBe('Main dining room');
  });

  /** Copies rather than the stored arrays, so the first edit does not mutate
   * the draft the editor is comparing itself against. */
  it('hands the editor its own arrays', () => {
    const stored = draft({ objects: [wall], tables: [table()] });
    const opened = draftLayout(stored);

    expect(opened.objects).not.toBe(stored.objects);
    expect(opened.tables).not.toBe(stored.tables);
  });
});

describe('the change summary', () => {
  const published = {
    fields: publishedFields(room()),
    layout: layout({ objects: [wall], tables: [table()] }),
  };

  it('reports nothing for a plan that matches what is published', () => {
    expect(changeSummary(published, published).changed).toBe(false);
  });

  it('separates a table that is new from one that only moved', () => {
    const summary = changeSummary(published, {
      fields: published.fields,
      layout: layout({
        objects: [wall],
        tables: [
          table({ position: { x: 2500, y: 2000 } }),
          table({ id: 'table-2', label: '2', position: { x: 5000, y: 5000 } }),
        ],
      }),
    });

    expect(summary.tablesAdded).toBe(1);
    expect(summary.tablesChanged).toBe(1);
    expect(summary.tablesRemoved).toBe(0);
    expect(summary.changed).toBe(true);
  });

  it('counts the tables the owner removed', () => {
    const summary = changeSummary(published, {
      fields: published.fields,
      layout: layout({ objects: [wall], tables: [] }),
    });

    expect(summary.tablesRemoved).toBe(1);
  });

  it('counts geometry added, changed and removed', () => {
    const summary = changeSummary(published, {
      fields: published.fields,
      layout: layout({
        objects: [
          { ...wall, rotation: 90 },
          { ...wall, id: 'door-1', type: 'door' },
        ],
        tables: [table()],
      }),
    });

    expect(summary.objectsAdded).toBe(1);
    expect(summary.objectsChanged).toBe(1);
    expect(summary.objectsRemoved).toBe(0);
  });

  /** The three room fields are named one by one because each is a different
   * kind of surprise: a resize can put a table outside its room. */
  it('names a rename, a resize and a change of level separately', () => {
    const summary = changeSummary(published, {
      fields: {
        name: 'Terrace',
        size: { width: 7000, height: 12_000 },
        floor: 'Upstairs',
      },
      layout: published.layout,
    });

    expect(summary.roomRenamed).toBe(true);
    expect(summary.roomResized).toBe(true);
    expect(summary.floorChanged).toBe(true);
  });
});
