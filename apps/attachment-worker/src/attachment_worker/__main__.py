"""python -m attachment_worker: readiness-gated entrypoint; noisy exit if unhealthy."""

import sys

from .config import load_config
from .coordinator import Coordinator


def main():
    config = load_config()
    worker = Coordinator(config)
    worker.start()
    try:
        worker.run()
    finally:
        for connection in (worker.conn, worker.heartbeat_conn):
            try:
                if connection is not None:
                    connection.close()
            except Exception:
                pass
    return 0


if __name__ == "__main__":
    sys.exit(main())
