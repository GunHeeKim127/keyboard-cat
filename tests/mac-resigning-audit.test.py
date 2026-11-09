import importlib.util
import pathlib
import struct
import unittest

spec = importlib.util.spec_from_file_location('audit', pathlib.Path(__file__).parents[1] / 'scripts/audit-mac-resigning.py')
audit = importlib.util.module_from_spec(spec)
spec.loader.exec_module(audit)

def binary(code=b'abcd', signature=b'sign'):
    section = struct.pack('<16s16sQQIIIIIIII', b'__text', b'__TEXT', 0, len(code), 200, 0, 0, 0, 0, 0, 0, 0)
    segment = struct.pack('<II16sQQQQIIII', 0x19, 152, b'__TEXT', 0, 4096, 0, 204, 7, 5, 1, 0) + section
    signing = struct.pack('<IIII', 0x1d, 16, 204, len(signature))
    header = struct.pack('<8I', 0xfeedfacf, 0x100000c, 0, 2, 2, 168, 0, 0)
    return header + segment + signing + code + signature

class ResigningAuditTests(unittest.TestCase):
    def test_signature_bytes_may_change(self):
        self.assertEqual(audit.payload(binary(signature=b'old')), audit.payload(binary(signature=b'new-signature')))

    def test_executable_code_change_is_detected(self):
        self.assertNotEqual(audit.payload(binary()), audit.payload(binary(code=b'evil')))

    def test_invalid_command_bounds_rejected(self):
        data = bytearray(binary()); struct.pack_into('<I', data, 36, 9999)
        with self.assertRaises(ValueError): audit.payload(data)

    def test_invalid_architecture_bounds_rejected(self):
        data = struct.pack('>7I', 0xcafebabe, 1, 0x100000c, 0, 9000, 10, 0)
        with self.assertRaises(ValueError): audit.slices(data)

if __name__ == '__main__': unittest.main()
