#!/usr/bin/env python3
"""
UI/UX Pro Max - Local BM25 Design Intelligence Search Engine
Powered entirely by Python Standard Library (Offline, Zero Dependencies).
"""

import os
import sys
import io
import re
import math
import csv
import argparse
from pathlib import Path

# Ensure UTF-8 output on Windows
if sys.stdout.encoding and sys.stdout.encoding.lower() != 'utf-8':
    try:
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    except Exception:
        pass

DATA_DIR = Path(__file__).resolve().parent.parent / "data"

class BM25:
    def __init__(self, corpus, k1=1.5, b=0.75):
        self.k1 = k1
        self.b = b
        self.corpus_size = len(corpus)
        self.avgdl = sum(len(doc) for doc in corpus) / max(1, self.corpus_size)
        self.doc_freqs = []
        self.idf = {}
        self.doc_lens = [len(doc) for doc in corpus]

        df = {}
        for doc in corpus:
            frequencies = {}
            for term in doc:
                frequencies[term] = frequencies.get(term, 0) + 1
            self.doc_freqs.append(frequencies)
            for term in frequencies:
                df[term] = df.get(term, 0) + 1

        for term, freq in df.items():
            self.idf[term] = math.log(1 + (self.corpus_size - freq + 0.5) / (freq + 0.5))

    def get_scores(self, query):
        scores = [0.0] * self.corpus_size
        for term in query:
            if term not in self.idf:
                continue
            idf_val = self.idf[term]
            for i, doc_freq in enumerate(self.doc_freqs):
                freq = doc_freq.get(term, 0)
                if freq == 0:
                    continue
                num = freq * (self.k1 + 1)
                denom = freq + self.k1 * (1 - self.b + self.b * (self.doc_lens[i] / self.avgdl))
                scores[i] += idf_val * (num / denom)
        return scores

def tokenize(text):
    if not text:
        return []
    text = str(text).lower()
    return re.findall(r'\b[a-z0-9_-]+\b', text)

def load_domain_data(domain):
    csv_file = DATA_DIR / f"{domain}.csv"
    if not csv_file.exists():
        return []
    records = []
    with open(csv_file, mode='r', encoding='utf-8', errors='ignore') as f:
        reader = csv.DictReader(f)
        for row in reader:
            records.append(row)
    return records

def search_domain(query, domain, top_k=3):
    records = load_domain_data(domain)
    if not records:
        return []

    corpus = []
    for row in records:
        text = " ".join(str(val) for val in row.values())
        corpus.append(tokenize(text))

    query_tokens = tokenize(query)
    if not query_tokens:
        return records[:top_k]

    bm25 = BM25(corpus)
    scores = bm25.get_scores(query_tokens)

    ranked = sorted(enumerate(scores), key=lambda x: x[1], reverse=True)
    results = []
    for idx, score in ranked:
        if score > 0 or len(results) == 0:
            results.append((records[idx], score))
            if len(results) >= top_k:
                break
    return results

def generate_design_system(query, stack="react"):
    styles = search_domain(query, "styles", top_k=1)
    palettes = search_domain(query, "palettes", top_k=1)
    typography = search_domain(query, "typography", top_k=1)
    ux_rules = search_domain(query, "ux", top_k=3)
    stacks = search_domain(stack, "stacks", top_k=1)

    output = []
    output.append(f"# Design System Blueprint: {query.title()}")
    output.append(f"**Target Stack:** {stack.title()}\n")

    if styles:
        row, _ = styles[0]
        output.append(f"## 🎨 UI Style: {row.get('style_name', 'Modern Clean')}")
        output.append(f"- **Description:** {row.get('description', '')}")
        output.append(f"- **Key Characteristics:** {row.get('characteristics', '')}")
        output.append(f"- **Best For:** {row.get('best_for', '')}\n")

    if palettes:
        row, _ = palettes[0]
        output.append(f"## 🌈 Color Palette: {row.get('name', 'Curated Palette')}")
        output.append(f"- **Primary:** `{row.get('primary', '')}`")
        output.append(f"- **Secondary:** `{row.get('secondary', '')}`")
        output.append(f"- **Accent:** `{row.get('accent', '')}`")
        output.append(f"- **Surface / Background:** `{row.get('background', '')}` | `{row.get('surface', '')}`")
        output.append(f"- **Text (Primary / Muted):** `{row.get('text_primary', '')}` | `{row.get('text_secondary', '')}`")
        output.append(f"- **Reasoning:** {row.get('reasoning', '')}\n")

    if typography:
        row, _ = typography[0]
        output.append(f"## 🔤 Typography Hierarchy: {row.get('name', 'Modern Pair')}")
        output.append(f"- **Headings:** `{row.get('heading_font', '')}` ({row.get('heading_weights', '600, 700')})")
        output.append(f"- **Body:** `{row.get('body_font', '')}` ({row.get('body_weights', '400, 500')})")
        output.append(f"- **Monospace / Code:** `{row.get('code_font', 'JetBrains Mono')}`")
        output.append(f"- **Scale Step:** `{row.get('scale', '1.25 (Major Third)')}`\n")

    if ux_rules:
        output.append("## 📐 Core UX Guidelines & Quality Floor")
        for row, _ in ux_rules:
            output.append(f"- **{row.get('rule_name', '')}:** {row.get('guideline', '')}")
        output.append("")

    if stacks:
        row, _ = stacks[0]
        output.append(f"## ⚡ Stack Best Practices: {row.get('stack_name', stack)}")
        output.append(f"- **Recommended Libraries:** {row.get('libraries', '')}")
        output.append(f"- **Implementation Rules:** {row.get('guidelines', '')}")

    return "\n".join(output)

def main():
    parser = argparse.ArgumentParser(description="UI/UX Pro Max - BM25 Design Intelligence Search")
    parser.add_argument("query", nargs="?", default="", help="Search query (e.g., 'fintech dashboard', 'education lms')")
    parser.add_argument("--domain", "-d", choices=["styles", "palettes", "typography", "ux", "stacks", "all"], default="all", help="Domain to search")
    parser.add_argument("--design-system", "-ds", action="store_true", help="Generate complete cohesive design system")
    parser.add_argument("--stack", "-s", default="react", help="Target tech stack (react, vue, svelte, tailwind, etc.)")
    parser.add_argument("--top-k", "-k", type=int, default=3, help="Max results per domain")
    parser.add_argument("--list-domains", action="store_true", help="List available datasets")

    args = parser.parse_args()

    if args.list_domains:
        available = [f.stem for f in DATA_DIR.glob("*.csv")]
        print("Available datasets:", ", ".join(available))
        return

    if not args.query:
        print("Please provide a search query. Example: python search.py 'edtech education dashboard'")
        return

    if args.design_system:
        print(generate_design_system(args.query, stack=args.stack))
        return

    domains = ["styles", "palettes", "typography", "ux", "stacks"] if args.domain == "all" else [args.domain]

    found = False
    for dom in domains:
        results = search_domain(args.query, dom, top_k=args.top_k)
        if not results:
            continue
        found = True
        print(f"\n=== Domain: {dom.upper()} ===")
        for row, score in results:
            print(f"- [Score: {score:.2f}] {', '.join(f'{k}: {v}' for k, v in row.items())}")

    if not found:
        print(f"No results found for '{args.query}' in domain(s) '{args.domain}'.")

if __name__ == "__main__":
    main()

