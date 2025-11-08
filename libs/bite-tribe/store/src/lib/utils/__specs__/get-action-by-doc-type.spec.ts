import { getActionByDocType } from '../get-action-by-doc-type';

describe('getActionByDocType', () => {
  it('should return the correct action for bite docType with id', () => {
    const docType = 'bite';
    const entity = { id: '123', name: 'Test Bite' };
    const action = getActionByDocType(docType, entity);
    expect(action.type).toBe('[BITES] Save existing bite');
    expect(action.bite).toEqual(entity);
  });

  it('should return the correct action for bite docType without id', () => {
    const docType = 'bite';
    const entity = { name: 'New Bite' };
    const action = getActionByDocType(docType, entity);
    expect(action.type).toBe('[BITES] Save new bite');
    expect(action.bite).toEqual(entity);
  });

  it('should return the correct action for restaurant docType', () => {
    const docType = 'restaurant';
    const entity = { name: 'Test Restaurant' };
    const action = getActionByDocType(docType, entity);
    expect(action.type).toBe('[RESTAURANTS] Save new restaurant');
    expect(action.restaurant).toEqual(entity);
  });

  it('should return unknownEntity action for unknown docType', () => {
    const docType = 'unknown';
    const entity = { name: 'Unknown Entity' };
    const action = getActionByDocType(docType, entity);
    expect(action.type).toBe('[Unknown Entity]');
    expect(action.docType).toBe(docType);
  });
});
