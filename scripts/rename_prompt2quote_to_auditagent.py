#!/usr/bin/env python3
"""
Repo-wide rename utility: Prompt2Quote -> AuditAgent

Features:
- Dry run by default: prints planned changes
- Apply mode with backups optional
- Skips common binary and vendor directories
- Renames file contents and file/directory names

Usage:
  Dry run:  python3 scripts/rename_prompt2quote_to_auditagent.py
  Apply:     python3 scripts/rename_prompt2quote_to_auditagent.py --apply

Notes:
- Only exact, case-sensitive matches of 'Prompt2Quote' are replaced.
- Binary files are skipped (heuristic: any NUL byte present).
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

NEEDLE = "Prompt2Quote"
REPLACEMENT = "AuditAgent"

EXCLUDED_DIRS = {
    ".git",
    "node_modules",
    "dist",
    "build",
    ".next",
    ".cache",
    ".idea",
    ".vscode",
    "__pycache__",
    "target",
    "out",
    ".venv",
    "venv",
}

EXCLUDED_FILE_SUFFIXES = {
    ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".pdf",
    ".zip", ".gz", ".tar", ".tgz", ".xz", ".bz2",
}


def is_binary(path: Path) -> bool:
    try:
        with path.open("rb") as f:
            chunk = f.read(4096)
        return b"\x00" in chunk
    except Exception:
        return True


def read_text_safely(path: Path) -> str | None:
    try:
        data = path.read_bytes()
    except Exception:
        return None
    if b"\x00" in data:
        return None
    for enc in ("utf-8", "utf-8-sig", "latin-1"):
        try:
            return data.decode(enc)
        except Exception:
            continue
    return None


def write_text(path: Path, text: str) -> None:
    path.write_text(text, encoding="utf-8")


def should_exclude_dir(dirname: str) -> bool:
    return dirname in EXCLUDED_DIRS or dirname.startswith(".") and dirname not in {".github"}


def collect_paths(root: Path) -> list[Path]:
    paths: list[Path] = []
    for dirpath, dirnames, filenames in os.walk(root):
        # prune excluded dirs in-place
        dirnames[:] = [d for d in dirnames if not should_exclude_dir(d)]
        for name in filenames:
            p = Path(dirpath) / name
            # skip excluded suffixes
            if p.suffix.lower() in EXCLUDED_FILE_SUFFIXES:
                continue
            paths.append(p)
    return paths


def replace_in_files(paths: list[Path], apply: bool) -> int:
    changes = 0
    for path in paths:
        # content replacement
        text = read_text_safely(path)
        if text is None:
            continue
        if NEEDLE in text:
            new_text = text.replace(NEEDLE, REPLACEMENT)
            if new_text != text:
                changes += 1
                action = "UPDATE" if apply else "WOULD-UPDATE"
                print(f"{action}: {path}")
                if apply:
                    write_text(path, new_text)
    return changes


def rename_paths(root: Path, apply: bool) -> int:
    rename_ops: list[tuple[Path, Path]] = []
    # Collect files first (deepest paths first), then dirs (deepest first)
    all_paths = []
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if not should_exclude_dir(d)]
        for d in dirnames:
            all_paths.append(Path(dirpath) / d)
        for f in filenames:
            all_paths.append(Path(dirpath) / f)
    # Sort by depth descending to avoid conflicts when renaming
    all_paths.sort(key=lambda p: len(p.parts), reverse=True)

    for p in all_paths:
        name = p.name
        if NEEDLE in name:
            new_name = name.replace(NEEDLE, REPLACEMENT)
            rename_ops.append((p, p.with_name(new_name)))

    # Apply renames
    applied = 0
    for src, dst in rename_ops:
        action = "RENAME" if apply else "WOULD-RENAME"
        print(f"{action}: {src} -> {dst}")
        if apply:
            try:
                src.rename(dst)
                applied += 1
            except FileExistsError:
                # Avoid overwriting existing; report and skip
                print(f"SKIP (exists): {dst}")
            except Exception as e:
                print(f"ERROR renaming {src} -> {dst}: {e}")
    return applied


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Rename Prompt2Quote -> AuditAgent across repo")
    parser.add_argument("--apply", action="store_true", help="Apply changes instead of dry run")
    parser.add_argument("--root", default=".", help="Root directory to process (default: .)")
    args = parser.parse_args(argv)

    root = Path(args.root).resolve()
    if not root.exists():
        print(f"Root not found: {root}")
        return 2

    print(f"Scanning under: {root}")
    paths = collect_paths(root)

    print(f"\n--- Content replacements ({'apply' if args.apply else 'dry-run'}) ---")
    content_changes = replace_in_files(paths, apply=args.apply)
    print(f"Content files changed: {content_changes}")

    print(f"\n--- Path renames ({'apply' if args.apply else 'dry-run'}) ---")
    path_changes = rename_paths(root, apply=args.apply)
    print(f"Paths renamed: {path_changes}")

    if not args.apply:
        print("\nNo changes made (dry run). Re-run with --apply to modify files.")

    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))

