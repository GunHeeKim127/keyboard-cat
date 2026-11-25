"""Keep the existing public updater configuration in dir-only Mac previews.

electron-builder dir outputs omit app-update.yml. Create a separate signing
input; never edit the downloaded CI archive or access signing credentials.
"""
import argparse
import hashlib
import pathlib
import shutil
import stat
import zipfile

NAME = 'Keyboard Cat.app/Contents/Resources/app-update.yml'
EXPECTED = (b'owner: GunHeeKim127\nrepo: keyboard-cat\nprovider: github\n'
            b'releaseType: release\nupdaterCacheDirName: keyboard-cat-updater\n')

def prepare(template, rebuilt, output):
    with zipfile.ZipFile(template) as old, zipfile.ZipFile(rebuilt) as new:
        config = old.read(NAME)
        if config != EXPECTED: raise ValueError('Unexpected updater configuration')
        if NAME in new.namelist(): raise ValueError('Updater configuration already exists')
    output = pathlib.Path(output)
    with open(rebuilt, 'rb') as source, output.open('xb') as target:
        shutil.copyfileobj(source, target)
    with zipfile.ZipFile(output, 'a') as archive:
        entry = zipfile.ZipInfo(NAME)
        entry.create_system = 3
        entry.external_attr = (stat.S_IFREG | 0o644) << 16
        archive.writestr(entry, config)
    with output.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('template'); parser.add_argument('rebuilt'); parser.add_argument('output')
    args = parser.parse_args()
    print('MAC_PREVIEW_INPUT_SHA256 ' + prepare(args.template, args.rebuilt, args.output))
