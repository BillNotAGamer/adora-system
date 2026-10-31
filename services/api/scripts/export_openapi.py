"""Export the authoritative FastAPI OpenAPI document for client generation."""

import json
import sys
from pathlib import Path

SERVICE_ROOT = Path(__file__).resolve().parents[1]
REPOSITORY_ROOT = SERVICE_ROOT.parents[1]
sys.path.insert(0, str(SERVICE_ROOT))

from app.main import app  # noqa: E402


def main() -> None:
    output = SERVICE_ROOT / "openapi.json"
    output.write_text(
        json.dumps(app.openapi(), indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(f"Wrote {output.relative_to(REPOSITORY_ROOT)}")


if __name__ == "__main__":
    main()
