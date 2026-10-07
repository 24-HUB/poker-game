import { SystemGameClock } from './gameClock';

describe('system game clock', () => {
  let now: number;

  beforeEach(() => {
    jest.useFakeTimers();
    now = 1_000;
    jest.spyOn(Date, 'now').mockImplementation(() => now);
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('waits until the wall-clock deadline when a native timer fires early', () => {
    const callback = jest.fn();
    new SystemGameClock().schedule(6_000, callback);

    now = 5_999;
    jest.advanceTimersByTime(5_000);
    expect(callback).not.toHaveBeenCalled();

    now = 6_000;
    jest.advanceTimersByTime(1);
    expect(callback).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(10_000);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('cancels the replacement timer after an early callback', () => {
    const callback = jest.fn();
    const cancel = new SystemGameClock().schedule(6_000, callback);
    now = 5_999;
    jest.advanceTimersByTime(5_000);
    cancel();

    now = 6_000;
    jest.advanceTimersByTime(1);
    expect(callback).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
  });

  it('keeps the original deadline through repeated early callbacks', () => {
    const callback = jest.fn();
    new SystemGameClock().schedule(6_000, callback);
    now = 5_998;
    jest.advanceTimersByTime(5_000);
    now = 5_999;
    jest.advanceTimersByTime(2);
    expect(callback).not.toHaveBeenCalled();

    now = 6_000;
    jest.advanceTimersByTime(1);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('cancels before the initial timer fires', () => {
    const callback = jest.fn();
    const cancel = new SystemGameClock().schedule(6_000, callback);
    cancel();
    now = 6_000;
    jest.advanceTimersByTime(5_000);
    expect(callback).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
  });

  it('dispatches an already-due deadline asynchronously', () => {
    const callback = jest.fn();
    new SystemGameClock().schedule(999, callback);
    expect(callback).not.toHaveBeenCalled();
    jest.runOnlyPendingTimers();
    expect(callback).toHaveBeenCalledTimes(1);
  });
});
