"""Security boundaries for archives crossing the local signing boundary."""
import hashlib
import importlib.util
import pathlib
import stat
import tempfile
import unittest
import zipfile

spec = importlib.util.spec_from_file_location('archive', pathlib.Path(__file__).parents[1] / 'scripts/mac-signing-archive.py')
archive = importlib.util.module_from_spec(spec)
spec.loader.exec_module(archive)

class ArchiveBoundaryTests(unittest.TestCase):
    def check_archive(self, entries, valid=False, expected=None):
        with tempfile.TemporaryDirectory() as directory:
            file = pathlib.Path(directory) / 'app.zip'
            with zipfile.ZipFile(file, 'w') as z:
                for name, data, mode in entries:
                    info = zipfile.ZipInfo(name)
                    info.external_attr = mode << 16
                    z.writestr(info, data)
            digest = expected or hashlib.sha256(file.read_bytes()).hexdigest()
            if valid:
                archive.extract(file, pathlib.Path(directory) / 'output', digest, inspect=True)
            else:
                with self.assertRaises(ValueError):
                    archive.extract(file, pathlib.Path(directory) / 'output', digest, inspect=True)
            self.assertFalse((pathlib.Path(directory) / 'output').exists())

    def test_normal_app_and_internal_link(self):
        self.check_archive([
            ('Keyboard Cat.app/Contents/file', b'code', stat.S_IFREG | 0o755),
            ('Keyboard Cat.app/link', b'Contents/file', stat.S_IFLNK | 0o777),
        ], valid=True)

    def test_paths_outside_app(self):
        for name in ['../key', '/Keyboard Cat.app/file', 'Keyboard Cat.app/../key', 'Other.app/file', 'Keyboard Cat.app/C:/key']:
            with self.subTest(name=name): self.check_archive([(name, b'x', stat.S_IFREG)])

    def test_escaping_symlink(self):
        self.check_archive([('Keyboard Cat.app/link', b'../../key', stat.S_IFLNK)])

    def test_symlink_cycle(self):
        self.check_archive([('Keyboard Cat.app/a', b'b', stat.S_IFLNK), ('Keyboard Cat.app/b', b'a', stat.S_IFLNK)])

    def test_file_under_symlink(self):
        self.check_archive([('Keyboard Cat.app/a', b'Contents', stat.S_IFLNK), ('Keyboard Cat.app/a/file', b'x', stat.S_IFREG)])

    def test_case_insensitive_collision(self):
        self.check_archive([('Keyboard Cat.app/A', b'x', stat.S_IFREG), ('Keyboard Cat.app/a', b'y', stat.S_IFREG)])

    def test_special_device(self):
        self.check_archive([('Keyboard Cat.app/device', b'', stat.S_IFCHR)])

    def test_hash_mismatch(self):
        self.check_archive([('Keyboard Cat.app/file', b'x', stat.S_IFREG)], expected='0' * 64)

if __name__ == '__main__': unittest.main()
