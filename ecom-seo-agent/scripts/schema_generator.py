#!/usr/bin/env python3
"""Generate JSON-LD structured data snippets from a JSON fields file.

Field values must reflect content actually visible on the page - see
docs/02_SEO_RULES_AND_COMPLIANCE.md and templates/schema_template.md.
"""

import argparse
import json
import sys

SITE_NAME = "מכללת איקום"
SITE_ALT_NAME = "Ecom School"
SITE_URL = "https://www.ecomschool.co.il/"


def build_organization(fields):
    return {
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": SITE_NAME,
        "alternateName": SITE_ALT_NAME,
        "url": SITE_URL,
        "logo": fields.get("logo", ""),
        "sameAs": fields.get("sameAs", []),
    }


def build_educational_organization(fields):
    return {
        "@context": "https://schema.org",
        "@type": "EducationalOrganization",
        "name": SITE_NAME,
        "url": SITE_URL,
        "description": fields.get("description", ""),
    }


def build_course(fields):
    required = ["name", "description"]
    missing = [f for f in required if not fields.get(f)]
    if missing:
        sys.exit(f"Missing required fields for course schema: {', '.join(missing)}")
    schema = {
        "@context": "https://schema.org",
        "@type": "Course",
        "name": fields["name"],
        "description": fields["description"],
        "provider": {
            "@type": "Organization",
            "name": SITE_NAME,
            "sameAs": SITE_URL,
        },
    }
    # Only include price/duration if explicitly confirmed as visible on the page.
    if fields.get("confirmed_visible_on_page"):
        for optional_key in ["hasCourseInstance", "offers"]:
            if fields.get(optional_key):
                schema[optional_key] = fields[optional_key]
    return schema


def build_breadcrumb(fields):
    items = fields.get("items", [])
    if not items:
        sys.exit("breadcrumb schema requires a non-empty 'items' list: [{name, url}, ...]")
    return {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": i + 1, "name": item["name"], "item": item["url"]}
            for i, item in enumerate(items)
        ],
    }


def build_article(fields):
    required = ["headline", "description", "datePublished"]
    missing = [f for f in required if not fields.get(f)]
    if missing:
        sys.exit(f"Missing required fields for article schema: {', '.join(missing)}")
    return {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": fields["headline"],
        "description": fields["description"],
        "author": {"@type": "Organization", "name": SITE_NAME},
        "publisher": {"@type": "Organization", "name": SITE_NAME},
        "datePublished": fields["datePublished"],
        "dateModified": fields.get("dateModified", fields["datePublished"]),
    }


def build_faq(fields):
    questions = fields.get("questions", [])
    if not questions:
        sys.exit("faq schema requires a non-empty 'questions' list: [{question, answer}, ...] "
                  "matching a visible FAQ block on the page")
    return {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
            {
                "@type": "Question",
                "name": q["question"],
                "acceptedAnswer": {"@type": "Answer", "text": q["answer"]},
            }
            for q in questions
        ],
    }


BUILDERS = {
    "organization": build_organization,
    "educational_organization": build_educational_organization,
    "course": build_course,
    "breadcrumb": build_breadcrumb,
    "article": build_article,
    "faq": build_faq,
}


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--type", required=True, choices=sorted(BUILDERS.keys()))
    parser.add_argument("--input", required=True, help="JSON file with field values")
    parser.add_argument("-o", "--output", help="Output file (default: stdout)")
    parser.add_argument("--html", action="store_true", help="Wrap output in a <script type=\"application/ld+json\"> tag")
    args = parser.parse_args()

    with open(args.input, encoding="utf-8") as f:
        fields = json.load(f)

    schema = BUILDERS[args.type](fields)
    output = json.dumps(schema, ensure_ascii=False, indent=2)
    if args.html:
        output = f'<script type="application/ld+json">\n{output}\n</script>'

    if args.output:
        with open(args.output, "w", encoding="utf-8") as f:
            f.write(output + "\n")
        print(f"Wrote {args.type} schema to {args.output}")
    else:
        print(output)


if __name__ == "__main__":
    main()
