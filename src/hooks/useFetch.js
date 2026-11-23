import { useCallback, useEffect, useRef, useState } from 'react'

// Runs an async function on mount (and whenever `deps` change) and tracks its state.
// `reload()` re-runs it, which is how pages refresh after create/update/delete.
export function useFetch(fn, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null })
  const latest = useRef(0) // ignore results from outdated calls (fast typing / unmounts)

  const run = useCallback(async () => {
    const id = ++latest.current
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const data = await fn()
      if (id === latest.current) setState({ data, loading: false, error: null })
    } catch (error) {
      if (id === latest.current) setState((s) => ({ ...s, loading: false, error }))
    }
  }, deps) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { run(); return () => { latest.current++ } }, [run])
  return { ...state, reload: run }
}
