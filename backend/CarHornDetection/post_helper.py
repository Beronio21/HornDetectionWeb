import threading
import time
import json
import random
from pathlib import Path

try:
    import requests
    from requests.adapters import HTTPAdapter
    from urllib3.util.retry import Retry
except Exception:
    requests = None


def _build_session(max_retries=5, backoff_factor=0.5, status_forcelist=(500, 502, 503, 504)):
    if requests is None:
        return None
    session = requests.Session()
    retries = Retry(total=max_retries, backoff_factor=backoff_factor,
                    status_forcelist=status_forcelist, allowed_methods=frozenset(["GET", "POST"]))
    adapter = HTTPAdapter(max_retries=retries)
    session.mount("http://", adapter)
    session.mount("https://", adapter)
    return session


def post_event(event, api_url, headers=None, max_retries=5, timeout=20, output_dir=None, filename=None):
    """Synchronously POST `event` JSON to `api_url` with retries.
    Returns True on success, False on final failure. On failure, writes a .failed file next to original JSON when possible.
    """
    headers = headers or {"Content-Type": "application/json"}

    if requests is None:
        print("post_helper: requests library not available; skipping POST")
        return False

    session = _build_session(max_retries=max_retries)
    last_exc = None
    try:
        for attempt in range(1, max_retries + 1):
            try:
                resp = session.post(api_url, json=event,
                                    headers=headers, timeout=timeout)
                if resp.status_code in (200, 201):
                    print(f"Posted horn event to API: {resp.status_code}")
                    return True
                else:
                    print(
                        f"API post returned status {resp.status_code}: {resp.text}")
            except Exception as e:
                last_exc = e
                sleep = min(2 ** attempt + random.random(), 30)
                print(
                    f"post_helper: attempt {attempt} failed: {e}; sleeping {sleep:.1f}s before retry")
                time.sleep(sleep)
        # final failure
    except Exception as e:
        last_exc = e

    # persist failure details if possible
    if output_dir and filename:
        try:
            p = Path(output_dir) / (filename + ".failed.json")
            with open(p, "w", encoding="utf-8") as fh:
                json.dump({"event": event, "error": str(last_exc)},
                          fh, indent=2)
            print(f"Wrote failed POST file: {p}")
        except Exception as e:
            print(f"post_helper: failed to write failure file: {e}")

    print("post_helper: failed to POST event after retries")
    return False


def post_event_async(event, api_url, headers=None, max_retries=5, timeout=20, output_dir=None, filename=None):
    """Run `post_event` in a daemon thread so the caller is non-blocking."""

    def _worker():
        try:
            post_event(event, api_url, headers=headers, max_retries=max_retries,
                       timeout=timeout, output_dir=output_dir, filename=filename)
        except Exception as e:
            print(f"post_helper.worker: unexpected error: {e}")

    t = threading.Thread(target=_worker, daemon=True)
    t.start()
    return t
