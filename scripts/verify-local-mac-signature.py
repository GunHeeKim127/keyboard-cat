"""Verify a locally signed app on macOS; never accepts signing credentials."""
import argparse
import hashlib
import json
import pathlib
import re
import subprocess
import tarfile

parser = argparse.ArgumentParser()
parser.add_argument('archive')
parser.add_argument('sha256')
parser.add_argument('certificate')
args = parser.parse_args()
if not re.fullmatch(r'[0-9a-f]{64}', args.sha256): raise ValueError('Invalid archive hash')
if not re.fullmatch(r'[0-9A-F]{40}', args.certificate): raise ValueError('Invalid certificate hash')
archive = pathlib.Path(args.archive)
if hashlib.file_digest(archive.open('rb'), 'sha256').hexdigest() != args.sha256:
    raise ValueError('Archive hash mismatch')
destination = pathlib.Path('work/local-signature-native-check')
destination.mkdir(parents=True, exist_ok=False)
with tarfile.open(archive) as source:
    members = source.getmembers()
    if len(members) > 15000 or sum(m.size for m in members) > 2 * 1024**3:
        raise ValueError('Archive exceeds limits')
    names = set()
    for m in members:
        parts = pathlib.PurePosixPath(m.name).parts
        if not parts or parts[0] != 'Keyboard Cat.app' or '..' in parts or '\\' in m.name:
            raise ValueError('Unsafe app path')
        if m.name.casefold() in names: raise ValueError('Duplicate path')
        names.add(m.name.casefold())
        if not (m.isfile() or m.isdir() or m.issym()): raise ValueError('Unsupported entry')
        if m.size > 512 * 1024**2: raise ValueError('Entry exceeds limit')
    # Python's data filter also rejects escaping symlinks and unsafe permissions.
    source.extractall(destination, members=members, filter='data')
app = destination / 'Keyboard Cat.app'
subprocess.run(['codesign', '--verify', '--deep', '--strict', str(app)], check=True)
requirements = {}
for relative in ['', 'Contents/MacOS/KeyCounter-mac', 'Contents/MacOS/DesktopScene-mac']:
    item = app / relative
    result = subprocess.run(['codesign', '-d', '-r-', str(item)], text=True, capture_output=True, check=True)
    text = result.stdout + result.stderr
    if args.certificate not in text.upper() or 'cdhash' in text.lower():
        raise ValueError('Signature does not use expected fixed certificate')
    requirements[relative or 'app'] = text.strip()
subprocess.run(['node', 'scripts/run-packaged-smoke.cjs', str(app.resolve())], check=True)
subprocess.run(['node', 'scripts/run-interaction-smoke.cjs', str(app.resolve())], check=True)
pathlib.Path('work/local-signature-native-report.json').write_text(json.dumps({
    'nativeVerificationPassed': True, 'requirements': requirements,
    'privateKeyUploaded': False, 'physicalMacPermissionTest': 'not performed',
}, indent=2))
