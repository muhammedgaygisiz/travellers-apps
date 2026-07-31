import { NOTIFICATION_MESSAGES } from '../messages';
import { en } from '../messages/en';
import { NotificationMessageKey } from '../notification-messages';
import { SUPPORTED_LANGUAGES } from '../supported-languages';
import { createTranslate } from '../translate';

describe('createTranslate', () => {
  it('renders the copy of the requested language', () => {
    expect(createTranslate('de')('newFollower.title')).toBe('Neuer Follower!');
  });

  it('interpolates the parameters of a message', () => {
    expect(
      createTranslate('en')('newLike.body', {
        liker: 'Mo',
        bite: 'Ramen',
      }),
    ).toBe('Mo liked your Bite "Ramen".');
  });

  it('interpolates numbers', () => {
    expect(createTranslate('en')('leaderboard.climbed', { rank: 3 })).toBe(
      'You climbed up to #3 on the leaderboard! 🎉',
    );
  });

  it('leaves an unmatched placeholder visible instead of blanking it', () => {
    // A silent gap in a shipped notification hides the bug; the raw token does
    // not.
    expect(createTranslate('en')('newFollower.body', {})).toBe(
      '{{follower}} is now following you.',
    );
  });

  it('falls back to English for a language the app does not offer', () => {
    expect(createTranslate('kl')('newFollower.title')).toBe('New Follower!');
  });

  it('falls back to English for a stored value that is not a language', () => {
    expect(createTranslate('')('newFollower.title')).toBe('New Follower!');
  });

  it('resolves a locale with a region subtag to its base language', () => {
    expect(createTranslate('de-CH')('newFollower.title')).toBe(
      'Neuer Follower!',
    );
  });
});

describe('notification message catalog', () => {
  const keys = Object.keys(en) as NotificationMessageKey[];

  it.each(SUPPORTED_LANGUAGES)('covers every key in %s', (language) => {
    expect(Object.keys(NOTIFICATION_MESSAGES[language]).sort()).toEqual(
      [...keys].sort(),
    );
  });

  it.each(SUPPORTED_LANGUAGES)(
    'keeps the placeholders of every message in %s',
    (language) => {
      const placeholders = (message: string): string[] =>
        (message.match(/{{\s*\w+\s*}}/g) ?? []).sort();

      keys.forEach((key) => {
        // A translation that loses a placeholder silently drops the name, Bite
        // title, or rank the sentence is about.
        expect({
          key,
          placeholders: placeholders(NOTIFICATION_MESSAGES[language][key]),
        }).toEqual({ key, placeholders: placeholders(en[key]) });
      });
    },
  );

  it.each(SUPPORTED_LANGUAGES)('has no blank copy in %s', (language) => {
    keys.forEach((key) => {
      expect(NOTIFICATION_MESSAGES[language][key].trim()).not.toBe('');
    });
  });
});
