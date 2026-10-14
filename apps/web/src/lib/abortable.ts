/** Bound even injected readers/body parsers that do not settle on cancellation. */
export async function abortable<T>(work: () => Promise<T>, signal: AbortSignal): Promise<T> {
  let onAbort!: () => void;
  try {
    return await new Promise<T>((resolve, reject) => {
      onAbort = () => reject(new DOMException('Request canceled', 'AbortError'));
      if (signal.aborted) { onAbort(); return; }
      signal.addEventListener('abort', onAbort, { once: true });
      try { work().then(resolve, reject); } catch (error) { reject(error); }
    });
  } finally { signal.removeEventListener('abort', onAbort); }
}
