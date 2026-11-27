import { ErrorHandler, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { FirebaseFunctions } from '@capacitor-firebase/functions';
import { DietaryVoteApiService } from '../dietary-vote-api.service';

// Factories rather than automocks: the plugin objects are built by
// `registerPlugin` at import time, so an automock has none of their methods.
jest.mock('@capacitor-firebase/firestore', () => ({
  FirebaseFirestore: {
    addDocumentSnapshotListener: jest.fn(),
    removeSnapshotListener: jest.fn(),
    getDocument: jest.fn(),
  },
}));
jest.mock('@capacitor-firebase/functions', () => ({
  FirebaseFunctions: { callByName: jest.fn() },
}));

type Callback = (event: unknown, error: unknown) => void;

const addDocument = FirebaseFirestore.addDocumentSnapshotListener as jest.Mock;
const removeListener = FirebaseFirestore.removeSnapshotListener as jest.Mock;
const getDocument = FirebaseFirestore.getDocument as jest.Mock;
const callByName = FirebaseFunctions.callByName as jest.Mock;

/** See GitHub issue #2197. */
describe(DietaryVoteApiService.name, () => {
  let api: DietaryVoteApiService;
  let handleError: jest.Mock;
  let deliver: Callback;

  beforeEach(() => {
    addDocument.mockReset().mockImplementation((_options, callback) => {
      deliver = callback;

      return Promise.resolve('listener-1');
    });
    removeListener.mockReset().mockResolvedValue(undefined);
    getDocument.mockReset();
    callByName.mockReset();
    handleError = jest.fn();

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: ErrorHandler, useValue: { handleError } },
      ],
    });
    api = TestBed.inject(DietaryVoteApiService);
  });

  it('sends a vote to voteDietaryLabel and answers its result', async () => {
    const request = {
      target: { type: 'bite', biteId: 'b1' },
      label: 'vegan',
      vote: 'confirm',
    } as const;

    callByName.mockResolvedValue({
      data: { status: 'saved', tally: { confirm: 1, dispute: 0 } },
    });

    await expect(api.voteDietaryLabel(request)).resolves.toEqual({
      status: 'saved',
      tally: { confirm: 1, dispute: 0 },
    });
    expect(callByName).toHaveBeenCalledWith({
      name: 'voteDietaryLabel',
      data: request,
    });
  });

  it('does not swallow a failed call', async () => {
    callByName.mockRejectedValue(new Error('offline'));

    await expect(
      api.voteDietaryLabel({
        target: { type: 'bite', biteId: 'b1' },
        label: 'vegan',
        vote: 'confirm',
      }),
    ).rejects.toThrow('offline');
  });

  it("listens to a scope's counts and reads them by subject", () => {
    const seen: unknown[] = [];
    const subscription = api
      .tallies$('bite__b1')
      .subscribe((tallies) => seen.push(tallies));

    deliver(
      {
        snapshot: {
          data: { items: { b1: { vegan: { confirm: 2, dispute: 1 } } } },
        },
      },
      null,
    );
    deliver(null, new Error('denied'));

    expect(addDocument).toHaveBeenCalledWith(
      { reference: 'dietaryLabelTallies/bite__b1' },
      expect.any(Function),
    );
    expect(seen).toEqual([{ b1: { vegan: { confirm: 2, dispute: 1 } } }, {}]);
    expect(handleError).toHaveBeenCalled();

    subscription.unsubscribe();
  });

  it("reads the caller's own vote document", async () => {
    getDocument.mockResolvedValue({
      snapshot: { data: { items: { m1: { vegan: { vote: 'dispute' } } } } },
    });

    await expect(api.loadOwnVotes('menu__r1', 'u1')).resolves.toEqual({
      m1: { vegan: 'dispute' },
    });
    expect(getDocument).toHaveBeenCalledWith({
      reference: 'dietaryLabelVotes/menu__r1__u1',
    });
  });

  it('reads no own votes when the read fails', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    getDocument.mockRejectedValue(new Error('denied'));

    await expect(api.loadOwnVotes('menu__r1', 'u1')).resolves.toEqual({});
  });
});
