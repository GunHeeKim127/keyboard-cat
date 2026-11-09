"""Transfer only a Mac app, preserving Unix links/modes on the Windows signer."""
import argparse, hashlib, json, os, pathlib, posixpath, stat, zipfile

ROOT = 'Keyboard Cat.app'

def digest(file):
    h = hashlib.sha256()
    with open(file, 'rb') as stream:
        for data in iter(lambda: stream.read(1024 * 1024), b''): h.update(data)
    return h.hexdigest()

def relative(name):
    if not name or '\\' in name or ':' in name or '\0' in name or name.startswith('/'):
        raise ValueError('Unsafe archive path')
    parts = name.rstrip('/').split('/')
    if any(p in ('', '.', '..') for p in parts) or parts[0] != ROOT:
        raise ValueError('Archive entry outside the app')
    return '/'.join(parts)

def extract(archive, destination, expected, inspect=False):
    if digest(archive) != expected.lower(): raise ValueError('Input archive hash mismatch')
    dest = pathlib.Path(destination).resolve()
    if not inspect and dest.exists(): raise ValueError('Destination must be a new directory')
    records, links, folded, total = [], {}, set(), 0
    with zipfile.ZipFile(archive) as z:
        if len(z.infolist()) > 15000: raise ValueError('Too many archive entries')
        for entry in z.infolist():
            if entry.filename.startswith('__MACOSX/'): continue
            name = relative(entry.filename)
            if name.casefold() in folded: raise ValueError('Duplicate archive path')
            folded.add(name.casefold())
            total += entry.file_size
            if total > 2 * 1024**3 or entry.file_size > 512 * 1024**2: raise ValueError('Archive too large')
            mode = entry.external_attr >> 16
            kind = stat.S_IFMT(mode)
            if kind not in (0, stat.S_IFREG, stat.S_IFDIR, stat.S_IFLNK): raise ValueError('Unsupported archive entry')
            if kind == stat.S_IFLNK:
                if entry.file_size > 4096: raise ValueError('Oversized link')
                target = z.read(entry).decode('utf-8')
                if not target or '\\' in target or ':' in target or '\0' in target or target.startswith('/'):
                    raise ValueError('Unsafe symbolic link')
                resolved = posixpath.normpath(posixpath.join(posixpath.dirname(name), target))
                relative(resolved)
                links[name] = target
            records.append((entry, name, mode))
        def resolved(name):
            seen = set()
            for _ in range(64):
                if name in seen: raise ValueError('Symbolic link cycle')
                seen.add(name)
                prefix = next((p for p in links if name == p or name.startswith(p + '/')), None)
                if prefix is None: return name
                name = posixpath.normpath(posixpath.join(posixpath.dirname(prefix), links[prefix]) + name[len(prefix):])
                relative(name)
            raise ValueError('Too many link indirections')
        for name in links: resolved(name)
        for entry, name, mode in records:
            if any(name.startswith(p + '/') for p in links): raise ValueError('Entry nested under a symbolic link')
        if inspect:
            print(json.dumps({'validated': len(records), 'links': len(links), 'bytes': total}))
            return
        dest.mkdir(parents=True)
        modes = {}
        for entry, name, mode in records:
            target = dest.joinpath(*name.split('/'))
            modes[name] = stat.S_IMODE(mode) or (0o755 if entry.is_dir() else 0o644)
            if name in links: continue
            if entry.is_dir(): target.mkdir(parents=True, exist_ok=True)
            else:
                target.parent.mkdir(parents=True, exist_ok=True)
                with z.open(entry) as source, open(target, 'xb') as output:
                    for data in iter(lambda: source.read(1024 * 1024), b''): output.write(data)
        for name, link in sorted(links.items(), key=lambda p: p[0].count('/'), reverse=True):
            target = dest.joinpath(*name.split('/')); target.parent.mkdir(parents=True, exist_ok=True)
            end = resolved(name)
            is_dir = any(n.startswith(end + '/') for _, n, _ in records)
            os.symlink(link, target, target_is_directory=is_dir)
        (dest / 'unix-modes.json').write_text(json.dumps(modes), encoding='utf-8')
    print(json.dumps({'extracted': len(records), 'links': len(links), 'bytes': total}))

def pack(source, output):
    parent = pathlib.Path(source).resolve(); app = parent / ROOT
    if not app.is_dir() or app.is_symlink(): raise ValueError('Invalid signed app root')
    modes = json.loads((parent / 'unix-modes.json').read_text(encoding='utf-8'))
    target = pathlib.Path(output).resolve()
    if app in target.parents or target.exists(): raise ValueError('Output must be a new file outside app')
    files = []
    for directory, dirs, names in os.walk(app, followlinks=False):
        for name in sorted(dirs + names):
            p = pathlib.Path(directory) / name
            if p.is_dir() and not p.is_symlink(): continue
            files.append(p)
    with zipfile.ZipFile(target, 'x', zipfile.ZIP_DEFLATED, compresslevel=6) as z:
        for file in files:
            name = relative(file.relative_to(parent).as_posix()); info = zipfile.ZipInfo(name); info.create_system = 3
            if file.is_symlink():
                link = os.readlink(file).replace('\\', '/')
                relative(posixpath.normpath(posixpath.join(posixpath.dirname(name), link)))
                info.external_attr = (stat.S_IFLNK | 0o777) << 16
                z.writestr(info, link.encode('utf-8'))
            else:
                if not stat.S_ISREG(file.stat().st_mode): raise ValueError('Unexpected signed file type')
                info.external_attr = (stat.S_IFREG | modes.get(name, 0o644)) << 16
                info.compress_type = zipfile.ZIP_DEFLATED
                with z.open(info, 'w', force_zip64=True) as out, open(file, 'rb') as inp:
                    for data in iter(lambda: inp.read(1024 * 1024), b''): out.write(data)
    print(json.dumps({'files': len(files), 'sha256': digest(target), 'size': target.stat().st_size}))

if __name__ == '__main__':
    parser = argparse.ArgumentParser(); parser.add_argument('operation', choices=['extract', 'pack', 'validate']); parser.add_argument('input'); parser.add_argument('output', nargs='?'); parser.add_argument('--sha256')
    args = parser.parse_args()
    if args.operation in ('extract', 'validate'):
        if not args.sha256: parser.error('--sha256 is required')
        if args.operation == 'extract' and not args.output: parser.error('output is required')
        extract(args.input, args.output or 'validation-only', args.sha256, inspect=args.operation == 'validate')
    else:
        if not args.output: parser.error('output is required')
        pack(args.input, args.output)
