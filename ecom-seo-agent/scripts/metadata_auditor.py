#!/usr/bin/env python3
"""Audit titles/meta descriptions/H1s from a CSV export for common SEO issues."""

import argparse
import csv
import sys
from collections import Counter

REQUIRED_COLUMNS = ["url", "title", "meta_description", "h1"]
TITLE_MIN, TITLE_MAX = 30, 60
META_MIN, META_MAX = 70, 155


def load_rows(path):
    with open(path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        missing = [c for c in REQUIRED_COLUMNS if c not in reader.fieldnames]
        if missing:
            sys.exit(f"Missing required columns in {path}: {', '.join(missing)}")
        return list(reader)


def audit_rows(rows):
    title_counts = Counter(r.get("title", "").strip() for r in rows)
    meta_counts = Counter(r.get("meta_description", "").strip() for r in rows)

    results = []
    for row in rows:
        issues = []
        title = row.get("title", "").strip()
        meta = row.get("meta_description", "").strip()
        h1 = row.get("h1", "").strip()
        keyword = row.get("target_keyword", "").strip()

        if not title:
            issues.append("Title חסר")
        elif not (TITLE_MIN <= len(title) <= TITLE_MAX):
            issues.append(f"אורך Title לא אופטימלי ({len(title)} תווים)")
        if title and title_counts[title] > 1:
            issues.append("Title כפול (מופיע ביותר מעמוד אחד)")

        if not meta:
            issues.append("Meta Description חסר")
        elif not (META_MIN <= len(meta) <= META_MAX):
            issues.append(f"אורך Meta Description לא אופטימלי ({len(meta)} תווים)")
        if meta and meta_counts[meta] > 1:
            issues.append("Meta Description כפול")

        if not h1:
            issues.append("H1 חסר")

        if keyword:
            if keyword not in title:
                issues.append("מילת מפתח היעד לא מופיעה ב-Title")
            if keyword not in h1:
                issues.append("מילת מפתח היעד לא מופיעה ב-H1")

        results.append({"url": row.get("url", ""), "issues": issues})
    return results


def to_markdown(results):
    total = len(results)
    clean = sum(1 for r in results if not r["issues"])
    lines = [f"# דוח בדיקת מטא-דאטה", "", f"סה\"כ עמודים: {total} | ללא ממצאים: {clean}", ""]
    for r in results:
        if not r["issues"]:
            continue
        lines.append(f"## {r['url']}")
        for issue in r["issues"]:
            lines.append(f"- {issue}")
        lines.append("")
    if clean == total:
        lines.append("לא נמצאו ממצאים.")
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", help="CSV with columns: url,title,meta_description,h1[,target_keyword]")
    parser.add_argument("-o", "--output", help="Output Markdown file (default: stdout)")
    args = parser.parse_args()

    rows = load_rows(args.input)
    results = audit_rows(rows)
    markdown = to_markdown(results)

    if args.output:
        with open(args.output, "w", encoding="utf-8") as f:
            f.write(markdown + "\n")
        print(f"Wrote metadata audit for {len(results)} pages to {args.output}")
    else:
        print(markdown)


if __name__ == "__main__":
    main()
