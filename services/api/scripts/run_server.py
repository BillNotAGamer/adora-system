"""Run Uvicorn with an event loop compatible with psycopg async on Windows."""

import argparse
from pathlib import Path

import uvicorn

SERVICE_ROOT = Path(__file__).resolve().parents[1]


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the ADORA FastAPI service")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", default=8000, type=int)
    parser.add_argument("--reload", action="store_true")
    args = parser.parse_args()

    uvicorn.run(
        "app.main:app",
        app_dir=str(SERVICE_ROOT),
        host=args.host,
        port=args.port,
        reload=args.reload,
        loop="app.core.event_loop:platform_loop_factory",
    )


if __name__ == "__main__":
    main()
