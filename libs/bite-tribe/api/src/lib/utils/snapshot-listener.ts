import type { CallbackId } from '@capacitor-firebase/firestore';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { Observable } from 'rxjs';

/**
 * One delivery from a Firestore snapshot listener, and what it says about the
 * listener itself (GitHub issue #1104).
 *
 * The data alone was never the whole answer. A document nobody has touched for
 * an hour delivers nothing and is perfectly live, and a listener the SDK
 * detached after a refused token delivers nothing and is not - so "is this
 * current" cannot be read off the payload, and the screens that promise a guest
 * a status "within seconds" have to be told rather than left to infer it. The
 * staff floor plan of issue #1096 reached the same shape for the same reason.
 */
export interface SnapshotDelivery<TEvent> {
  /** What arrived. `null` on the delivery that reported an error. */
  event: TEvent | null;
  /**
   * Whether the listener is still delivering.
   *
   * False from the first error onwards. A snapshot listener that errors is
   * detached by the SDK rather than retried, so everything after it is a screen
   * that has silently stopped updating - which is the one thing a live status
   * must never be without saying so.
   */
  live: boolean;
}

/**
 * A snapshot listener that lives exactly as long as the subscription to it.
 *
 * The third copy of a teardown dance that two services already got right, which
 * is where it stops being a coincidence and starts being a helper. The rule it
 * encodes, from issue #1310: a native snapshot listener outlives any RxJS
 * teardown of its own accord, so registering one without owning its removal
 * bills document reads nobody reads until the process ends - and a second
 * registration overwrites the only id that could have removed the first.
 *
 * Registration is asynchronous and a subscription can end before it resolves -
 * a guest who closes the ordering screen while it is still opening does exactly
 * that - so the teardown records that it has run and the registration removes
 * the listener it was too late to hand over.
 *
 * @param register Registers the listener and resolves its id. Called once per
 * subscription.
 * @param onError Where a listener error is reported. Errors are reported rather
 * than thrown at the subscriber, because completing the stream would leave the
 * screen holding what it last saw with nothing listening for the next change
 * and no way to say so.
 */
export const snapshotListener = <TEvent>(
  register: (
    callback: (event: TEvent | null, error: unknown) => void,
  ) => Promise<CallbackId>,
  onError: (error: unknown) => void,
): Observable<SnapshotDelivery<TEvent>> =>
  new Observable<SnapshotDelivery<TEvent>>((subscriber) => {
    let callbackId: CallbackId | undefined;
    let unsubscribed = false;

    void register((event, error) => {
      if (error) {
        onError(error);
        subscriber.next({ event: null, live: false });

        return;
      }

      subscriber.next({ event, live: true });
    }).then((id) => {
      callbackId = id;

      if (unsubscribed) {
        void removeListener(id, onError);
      }
    });

    return (): void => {
      unsubscribed = true;

      if (callbackId) {
        void removeListener(callbackId, onError);
      }
    };
  });

/**
 * Removes a listener, reporting a failure rather than raising it.
 *
 * A listener that cannot be removed is a leak worth reporting, and must not
 * take down the flow that was merely finished with it.
 */
const removeListener = async (
  callbackId: CallbackId,
  onError: (error: unknown) => void,
): Promise<void> => {
  try {
    await FirebaseFirestore.removeSnapshotListener({ callbackId });
  } catch (error) {
    onError(error);
  }
};
