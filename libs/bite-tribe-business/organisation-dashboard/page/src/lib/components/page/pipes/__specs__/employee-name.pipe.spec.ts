import { EmployeeNamePipe } from '../employee-name.pipe';
import { PublicUser } from 'model';

describe('EmployeeNamePipe', () => {
  let pipe: EmployeeNamePipe;

  beforeEach(() => {
    pipe = new EmployeeNamePipe();
  });

  it('should return the display name for a known userId', () => {
    const employees: PublicUser[] = [
      {
        userId: 'user-1',
        displayName: 'Alice',
        email: 'alice@example.com',
        photoUrl: '',
      },
    ];

    expect(pipe.transform('user-1', employees)).toBe('Alice');
  });

  it('should return empty string for an unknown userId', () => {
    const employees: PublicUser[] = [];

    expect(pipe.transform('unknown', employees)).toBe('');
  });

  it('should return empty string when userId is undefined', () => {
    expect(pipe.transform(undefined, [])).toBe('');
  });

  it('should return empty string when employees is undefined', () => {
    expect(pipe.transform('user-1', undefined)).toBe('');
  });
});
