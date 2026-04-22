import time
from threading import Lock

class SimpleCache:
    """
    A simple thread-safe in-memory cache with TTL.
    """
    def __init__(self, default_ttl=300):
        self._cache = {}
        self._lock = Lock()
        self._default_ttl = default_ttl

    def set(self, key, value, ttl=None):
        ttl = ttl or self._default_ttl
        with self._lock:
            self._cache[key] = {
                "value": value,
                "expiry": time.time() + ttl
            }

    def get(self, key):
        with self._lock:
            item = self._cache.get(key)
            if not item:
                return None
            
            if time.time() > item["expiry"]:
                del self._cache[key]
                return None
            
            return item["value"]

    def delete(self, key):
        with self._lock:
            if key in self._cache:
                del self._cache[key]

    def clear(self):
        with self._lock:
            self._cache.clear()

# Global instance
data_cache = SimpleCache(default_ttl=300) # 5 minutes
