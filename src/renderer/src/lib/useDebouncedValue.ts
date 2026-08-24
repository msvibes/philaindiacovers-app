import { useEffect, useState } from 'react'

// A deliberate deviation from the design prototypes' synchronous no-debounce
// filtering: the prototypes filter an in-memory array, this app makes a real
// network request per change — undebounced typing would create a request
// pile-up/race. Used for the search input and the filter panel's pending-
// draft live count query.
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])

  return debounced
}
