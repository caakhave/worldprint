from __future__ import annotations

import shutil
import zipfile
from datetime import datetime
from pathlib import Path

SUITE_ROOT = Path(__file__).resolve().parents[1]
EXPORTS_DIR = SUITE_ROOT / "exports"
LATEST_ZIP = EXPORTS_DIR / "canyougeo-blackbox-latest.zip"

EXCLUDED_DIRS = {
    ".git",
    ".pytest_cache",
    ".venv",
    "__pycache__",
    "exports",
    "node_modules",
    "reports",
}

EXCLUDED_SUFFIXES = {
    ".pyc",
    ".pyo",
    ".pyd",
    ".log",
    ".pem",
    ".key",
}

SECRET_NAME_PARTS = {
    "secret",
    "service-role",
    "service_role",
    "token",
    "private-key",
    "private_key",
}


def should_exclude(path: Path) -> bool:
    relative_parts = path.relative_to(SUITE_ROOT).parts
    if any(part in EXCLUDED_DIRS for part in relative_parts):
        return True

    name = path.name.lower()
    if name == ".env":
        return True
    if path.suffix.lower() in EXCLUDED_SUFFIXES:
        return True
    return any(part in name for part in SECRET_NAME_PARTS)


def iter_export_files() -> list[Path]:
    files: list[Path] = []
    for path in SUITE_ROOT.rglob("*"):
        if path.is_dir() or should_exclude(path):
            continue
        files.append(path)
    return sorted(files)


def write_zip(destination: Path, files: list[Path]) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(destination, mode="w", compression=zipfile.ZIP_DEFLATED) as archive:
        for path in files:
            archive.write(path, Path(SUITE_ROOT.name) / path.relative_to(SUITE_ROOT))


def main() -> None:
    EXPORTS_DIR.mkdir(parents=True, exist_ok=True)
    files = iter_export_files()
    timestamp = datetime.now().strftime("%Y-%m-%d-%H%M")
    timestamped_zip = EXPORTS_DIR / f"canyougeo-blackbox-{timestamp}.zip"

    write_zip(timestamped_zip, files)
    shutil.copyfile(timestamped_zip, LATEST_ZIP)

    print(f"Exported {len(files)} files.")
    print(f"Latest zip: {LATEST_ZIP}")
    print(f"Timestamped zip: {timestamped_zip}")


if __name__ == "__main__":
    main()
