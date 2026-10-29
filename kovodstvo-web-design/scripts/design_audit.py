#!/usr/bin/env python3
"""Read-only review candidates. No browser, network, dependencies, or quality score."""
import argparse
import json
import re
from html.parser import HTMLParser
from pathlib import Path

EXTENSIONS = {'.html', '.htm', '.css'}
EXCLUDE = {'.git', 'node_modules', 'dist', 'build', '.next', '.venv', 'vendor'}
MAX_BYTES = 2_000_000


class Markup(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.nodes = []
        self.stack = []
        self.css = []
        self.in_style = False
        self.style_start = 0
        self.style_text = []

    def handle_starttag(self, tag, attrs):
        attributes = dict(attrs)
        self.nodes.append((tag, attributes, self.getpos()[0], any(t == 'label' for t in self.stack)))
        if tag == 'style':
            self.in_style = True
            self.style_start = self.getpos()[0]
            self.style_text = []
        if tag not in {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'}:
            self.stack.append(tag)

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        self.handle_endtag(tag)

    def handle_endtag(self, tag):
        if tag == 'style' and self.in_style:
            self.css.append((''.join(self.style_text), self.style_start - 1))
            self.in_style = False
        if tag in self.stack:
            self.stack = self.stack[:len(self.stack) - 1 - self.stack[::-1].index(tag)]

    def handle_data(self, data):
        if self.in_style:
            self.style_text.append(data)


def inspect_text(path, source):
    findings = []

    def add(line, rule, reason):
        findings.append({'file': str(path), 'line': line, 'rule': rule, 'review': reason})

    css_chunks = [(source, 0)] if path.suffix.lower() == '.css' else []
    if path.suffix.lower() in {'.html', '.htm'}:
        parser = Markup()
        parser.feed(source)
        css_chunks = parser.css
        labels = {a.get('for') for t, a, _, _ in parser.nodes if t == 'label' and a.get('for')}
        ids = set()
        for tag, a, line, nested_label in parser.nodes:
            ident = a.get('id')
            if ident:
                if ident in ids:
                    add(line, 'duplicate-id', 'Повторяющийся id: проверь связи подписей, якорей и JS.')
                ids.add(ident)
            if tag == 'html' and not a.get('lang', '').strip():
                add(line, 'document-language', 'Не указан язык документа; проверь lang.')
            if tag == 'img' and 'alt' not in a:
                add(line, 'image-alternative', 'Нет alt. Добавь смысловую альтернативу либо пустой alt для декора.')
            if tag in {'input', 'textarea', 'select'}:
                kind = a.get('type', 'text').lower()
                if kind not in {'hidden', 'button', 'submit', 'reset', 'image'} and not (
                    nested_label or ident in labels or a.get('aria-label', '').strip() or a.get('aria-labelledby', '').strip()
                ):
                    add(line, 'field-name', 'Не найдена статическая подпись поля; проверь доступное имя в браузере.')
                if tag == 'input' and kind == 'image' and not a.get('alt', '').strip() and not a.get('aria-label', '').strip() and not a.get('aria-labelledby', '').strip():
                    add(line, 'image-button-name', 'Графическая кнопка может не иметь имени; проверь alt/ARIA.')
            if tag in {'div', 'span'} and ('onclick' in a or a.get('role') == 'button'):
                add(line, 'custom-control', 'Ненативное управление: проверь клавиатуру, имя, роль и состояние; рассмотри button.')
            if tag == 'a' and a.get('href', '').strip().lower().startswith('javascript:'):
                add(line, 'script-link', 'Ссылка исполняет JavaScript; для действия обычно подходит button.')
            if tag in {'a', 'button'} and a.get('aria-hidden') == 'true':
                add(line, 'hidden-control', 'Интерактивный элемент скрыт от accessibility tree; проверь фокус и назначение.')
            if a.get('style'):
                css_chunks.append((a['style'], line - 1))
    rules = [
        ('transition-all', r'\btransition\s*:\s*all\b', 'transition: all может анимировать непредусмотренные свойства. Проверь фактическое поведение.'),
        ('focus-outline', r'\boutline\s*:\s*(?:none|0(?:px)?)\s*(?=[;}]|$)', 'Outline убран; убедись, что есть видимый альтернативный фокус.'),
        ('overflow-clip', r'\boverflow-x\s*:\s*(?:hidden|clip)\b', 'Горизонтальное переполнение скрыто; проверь, не маскирует ли это обрезку контента.')
    ]
    for css, offset in css_chunks:
        # Preserve newlines for accurate positions while ignoring comments.
        css = re.sub(r'/\*.*?\*/', lambda m: ''.join('\n' if c == '\n' else ' ' for c in m[0]), css, flags=re.S)
        for rule, pattern, reason in rules:
            for match in re.finditer(pattern, css, re.I):
                add(offset + css.count('\n', 0, match.start()) + 1, rule, reason)
    return sorted(findings, key=lambda f: (f['line'], f['rule']))


def audit(target):
    if not target.exists():
        raise ValueError(f'Path does not exist: {target}')
    paths = [target] if target.is_file() else sorted(
        p for p in target.rglob('*') if p.is_file() and not any(part in EXCLUDE for part in p.relative_to(target).parts)
    )
    result = {'kind': 'static-review-candidates', 'limitations': 'HTML/CSS only; no JS execution, computed styles, visual quality or accessibility certification.', 'scanned': [], 'skipped': [], 'findings': []}
    for path in paths:
        if path.is_symlink() or path.suffix.lower() not in EXTENSIONS:
            continue
        try:
            if path.stat().st_size > MAX_BYTES:
                result['skipped'].append({'file': str(path), 'reason': 'File exceeds 2 MB limit'})
                continue
            source = path.read_text(encoding='utf-8')
            result['findings'].extend(inspect_text(path, source))
            result['scanned'].append(str(path))
        except (OSError, UnicodeError) as exc:
            result['skipped'].append({'file': str(path), 'reason': str(exc)})
    if not result['scanned']:
        result['skipped'].append({'file': str(target), 'reason': 'No supported HTML/CSS files scanned'})
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('path', type=Path)
    parser.add_argument('--json', action='store_true')
    args = parser.parse_args()
    try:
        result = audit(args.path)
    except (ValueError, OSError) as exc:
        parser.exit(2, f'{exc}\n')
    if args.json:
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        print(result['limitations'])
        print(f"Scanned: {len(result['scanned'])}; candidates: {len(result['findings'])}; skipped: {len(result['skipped'])}")
        for finding in result['findings']:
            print(f"{finding['file']}:{finding['line']}: {finding['rule']}: {finding['review']}")
        for skipped in result['skipped']:
            print(f"Skipped {skipped['file']}: {skipped['reason']}")
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
