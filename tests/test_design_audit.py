import importlib.util
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('audit', Path(__file__).parents[1] / 'kovodstvo-web-design/scripts/design_audit.py')
audit = importlib.util.module_from_spec(spec)
spec.loader.exec_module(audit)

class ReviewCandidates(unittest.TestCase):
    def rules(self, markup):
        return {f['rule'] for f in audit.inspect_text(Path('index.html'), markup)}

    def test_labels_before_after_and_nested(self):
        self.assertEqual(self.rules('<input id="a"><label for="a">A</label><label>B<input></label><input aria-labelledby="external">'), set())

    def test_unlabelled_field_and_missing_alt(self):
        self.assertEqual(self.rules('<input><textarea></textarea><img src="a">'), {'field-name', 'image-alternative'})

    def test_empty_alt_is_valid(self):
        self.assertEqual(self.rules('<img alt=""><input type="hidden"><input type="submit" value="OK">'), set())

    def test_script_literals_not_css(self):
        self.assertEqual(self.rules('<script>const a="transition: all; outline:0;";</script>'), set())

    def test_comments_and_inline_css_positions(self):
        result = audit.inspect_text(Path('a.css'), '/* transition: all;\n outline: none */\na:focus { outline: 0; }')
        self.assertEqual([(r['rule'], r['line']) for r in result], [('focus-outline', 3)])
        self.assertEqual(self.rules('<button style="transition:all 1s">OK</button>'), {'transition-all'})

    def test_duplicate_ids_and_custom_button(self):
        self.assertEqual(self.rules('<div id="a" role="button">OK</div><p id="a"></p>'), {'duplicate-id', 'custom-control'})

    def test_directory_exclusions_and_unsupported_report(self):
        with tempfile.TemporaryDirectory() as folder:
            base = Path(folder)
            (base / 'node_modules').mkdir()
            (base / 'node_modules/a.html').write_text('<input>')
            (base / 'index.html').write_text('<input aria-label="A">')
            result = audit.audit(base)
            self.assertEqual(len(result['scanned']), 1)
            self.assertEqual(result['findings'], [])
            (base / 'view.jsx').write_text('<input/>')
            self.assertFalse(audit.audit(base / 'view.jsx')['scanned'])
            self.assertTrue(audit.audit(base / 'view.jsx')['skipped'])

if __name__ == '__main__':
    unittest.main()
