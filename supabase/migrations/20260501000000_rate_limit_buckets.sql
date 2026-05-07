-- Rate-limit buckets: fixed-window per-user counters for expensive Edge Function endpoints.
-- Each row tracks invocation count within a single time window (e.g. 1 min, 5 min, 1 hour).
-- The Edge runtime uses obra_rate_limit_check() for atomic check-and-increment.

CREATE TABLE IF NOT EXISTS public.rate_limit_buckets (
  user_id      UUID        NOT NULL,
  endpoint     TEXT        NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  count        INTEGER     NOT NULL DEFAULT 1,
  PRIMARY KEY (user_id, endpoint, window_start)
);

-- Index for cleanup queries scoped by endpoint + window (no user_id needed for sweeps).
CREATE INDEX IF NOT EXISTS rate_limit_buckets_endpoint_window_idx
  ON public.rate_limit_buckets (endpoint, window_start);

-- Service role only; Edge Functions use the service key and bypass RLS entirely.
ALTER TABLE public.rate_limit_buckets ENABLE ROW LEVEL SECURITY;

-- Stale bucket cleanup: delete rows older than 24 hours to bound table growth.
-- Called by obra_rate_limit_check on a probabilistic cadence (1% of calls).
CREATE OR REPLACE FUNCTION public.obra_rate_limit_cleanup()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.rate_limit_buckets
  WHERE window_start < now() - INTERVAL '24 hours';
END;
$$;

-- Atomic fixed-window rate-limit check.
--
-- p_user_id       : authenticated user UUID
-- p_endpoint      : function name, e.g. 'ai-generate-content'
-- p_window_seconds: window width in seconds (e.g. 60, 300, 3600)
-- p_max_count     : maximum calls allowed per window
--
-- Returns JSON:
--   { allowed: true,  count: N, limit: M }
--   { allowed: false, count: N, limit: M, retry_after: S }
--
-- Uses ON CONFLICT to upsert atomically; no separate SELECT needed.
CREATE OR REPLACE FUNCTION public.obra_rate_limit_check(
  p_user_id        UUID,
  p_endpoint       TEXT,
  p_window_seconds INTEGER,
  p_max_count      INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_epoch        BIGINT;
  v_window_start TIMESTAMPTZ;
  v_count        INTEGER;
BEGIN
  -- Align to fixed window boundary: floor(epoch / window) * window
  v_epoch        := EXTRACT(EPOCH FROM now())::BIGINT;
  v_window_start := to_timestamp((v_epoch / p_window_seconds) * p_window_seconds);

  INSERT INTO public.rate_limit_buckets (user_id, endpoint, window_start, count)
  VALUES (p_user_id, p_endpoint, v_window_start, 1)
  ON CONFLICT (user_id, endpoint, window_start)
  DO UPDATE SET count = rate_limit_buckets.count + 1
  RETURNING count INTO v_count;

  -- Probabilistic cleanup: ~1% of calls sweep stale rows.
  IF random() < 0.01 THEN
    PERFORM public.obra_rate_limit_cleanup();
  END IF;

  IF v_count > p_max_count THEN
    -- Seconds remaining until the current window expires.
    RETURN json_build_object(
      'allowed',      false,
      'count',        v_count,
      'limit',        p_max_count,
      'retry_after',  p_window_seconds - (v_epoch % p_window_seconds)
    );
  END IF;

  RETURN json_build_object(
    'allowed', true,
    'count',   v_count,
    'limit',   p_max_count
  );
END;
$$;

COMMENT ON TABLE  public.rate_limit_buckets         IS 'Fixed-window per-user rate-limit counters for expensive Edge Function endpoints.';
COMMENT ON FUNCTION public.obra_rate_limit_check    IS 'Atomic fixed-window rate-limit check. Returns JSON {allowed, count, limit[, retry_after]}.';
COMMENT ON FUNCTION public.obra_rate_limit_cleanup  IS 'Purge rate_limit_buckets rows older than 24 hours.';
