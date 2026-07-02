#!/usr/bin/env python3
"""Build a structured content inventory (Markdown) from a crawled-site CSV export."""

import argparse
import csv
import sys
from collections import Counter

REQUIRED_COLUMNS = ["url", "page_type", "title", "meta_description", "h1", "word_count", "target_keyword"]
OPTIONAL_COLUMNS = ["search_intent", "internal_links_out"]

# Kept intentionally short here; the authoritative list lives in
# docs/02_SEO_RULES_AND_COMPLIANCE.md. This is only a fast local heuristic.
RED_FLAG_TERMS = ["מובטח", "הבטחה", "הבטחת עבודה", "הבטחת השמה", "שכר מובטח", "תעבדו בוודאות"]

THIN_CONTENT_WORD_THRESHOLD = 300
TITLE_MAX_LEN = 60
META_MAX_LEN = 155


def load_rows(path):
    with open(path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        missing = [c for c in REQUIRED_COLUMNS if c not in reader.fieldnames]
        if missing:
            sys.exit(f"Missing required columns in {path}: {', '.join(missing)}")
        return list(reader)


def compliance_risk(row):
    text = " ".join([row.get("title", ""), row.get("meta_description", ""), row.get("h1", "")])
    hits = [term for term in RED_FLAG_TERMS if term in text]
    return "גבוה" if hits else "נמוך"


def quality_score(row, title_counts):
    score = 5
    try:
        word_count = int(row.get("word_count") or 0)
    except ValueError:
        word_count = 0
    if word_count < THIN_CONTENT_WORD_THRESHOLD:
        score -= 2
    if not row.get("meta_description", "").strip():
        score -= 1
    if not row.get("h1", "").strip():
        score -= 1
    if title_counts[row.get("title", "")] > 1:
        score -= 1
    return max(score, 1)


def recommended_action(row, title_counts):
    try:
        word_count = int(row.get("word_count") or 0)
    except ValueError:
        word_count = 0
    if title_counts[row.get("title", "")] > 1:
        return "מזג / הפנה (כותרת כפולה)"
    if word_count < THIN_CONTENT_WORD_THRESHOLD:
        return "הרחב (תוכן דל)"
    if not row.get("meta_description", "").strip() or not row.get("h1", "").strip():
        return "עדכן (שדות חסרים)"
    return "השאר"


def build_inventory(rows):
    title_counts = Counter(r.get("title", "") for r in rows)
    out = []
    for row in rows:
        out.append({
            "url": row.get("url", ""),
            "page_type": row.get("page_type", ""),
            "target_keyword": row.get("target_keyword", ""),
            "search_intent": row.get("search_intent", ""),
            "title": row.get("title", ""),
            "meta_description": row.get("meta_description", ""),
            "h1": row.get("h1", ""),
            "internal_links_out": row.get("internal_links_out", ""),
            "quality_score": quality_score(row, title_counts),
            "compliance_risk": compliance_risk(row),
            "recommended_action": recommended_action(row, title_counts),
        })
    return out


def escape_md_cell(value):
    return str(value).replace("|", "\\|").replace("\n", " ").strip()


def to_markdown(inventory):
    header = ("| URL | סוג עמוד | מילת מפתח יעד | כוונת חיפוש | כותרת | Meta Description | H1 | "
              "ציון איכות | סיכון ציות | פעולה מומלצת |")
    sep = "|---|---|---|---|---|---|---|---|---|---|"
    lines = [header, sep]
    for r in inventory:
        cells = [
            r["url"], r["page_type"], r["target_keyword"], r["search_intent"],
            r["title"], r["meta_description"], r["h1"], r["quality_score"],
            r["compliance_risk"], r["recommended_action"],
        ]
        lines.append("| " + " | ".join(escape_md_cell(c) for c in cells) + " |")
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", help="CSV export of crawled site pages")
    parser.add_argument("-o", "--output", help="Output Markdown file (default: stdout)")
    args = parser.parse_args()

    rows = load_rows(args.input)
    inventory = build_inventory(rows)
    markdown = to_markdown(inventory)

    if args.output:
        with open(args.output, "w", encoding="utf-8") as f:
            f.write(markdown + "\n")
        print(f"Wrote inventory for {len(inventory)} pages to {args.output}")
    else:
        print(markdown)


if __name__ == "__main__":
    main()
