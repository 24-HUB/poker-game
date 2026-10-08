import { parseReleaseSettings } from './release-controls';

describe('server-only release settings', () => {
  it('keeps development playable and production closed unless explicitly enabled', () => {
    expect(parseReleaseSettings({})).toEqual({ allowNewSessions: true, economyWritesEnabled: true });
    expect(parseReleaseSettings({ NODE_ENV: 'production' })).toEqual({ allowNewSessions: false, economyWritesEnabled: false });
    expect(parseReleaseSettings({ NODE_ENV: 'production', ALLOW_NEW_SESSIONS: 'true', ECONOMY_WRITES_ENABLED: 'true' }))
      .toEqual({ allowNewSessions: true, economyWritesEnabled: true });
  });

  it.each(['ALLOW_NEW_SESSIONS', 'ECONOMY_WRITES_ENABLED'])(
    'rejects malformed %s instead of silently enabling writes', (key) => {
      for (const value of ['false ', 'TRUE', '1', '', 'secret-value']) {
        expect(() => parseReleaseSettings({ [key]: value })).toThrow(`${key} must be true or false`);
      }
      expect(parseReleaseSettings({ [key]: 'false' })).toMatchObject(
        key === 'ALLOW_NEW_SESSIONS' ? { allowNewSessions: false } : { economyWritesEnabled: false },
      );
    },
  );
});
