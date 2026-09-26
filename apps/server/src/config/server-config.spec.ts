import { parseServerPort } from '../main';

describe('parseServerPort', () => {
  it.each(['0', '65536', 'not-a-number', '3001garbage'])('rejects invalid PORT %s', (value) => {
    expect(() => parseServerPort(value)).toThrow('PORT must be an integer between 1 and 65535');
  });

  it('uses 3001 when PORT is absent', () => {
    expect(parseServerPort(undefined)).toBe(3001);
  });
});
