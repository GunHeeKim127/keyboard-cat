"""Compare payloads before/after signing without extracting either archive."""
import argparse, hashlib, json, stat, struct, tarfile, zipfile

def slices(data):
    if data[:4] == b'\xca\xfe\xba\xbe':
        count = struct.unpack_from('>I', data, 4)[0]
        if count > 32: raise ValueError('Too many architectures')
        result = {}
        for index in range(count):
            cpu, subtype, offset, size, alignment = struct.unpack_from('>IIIII', data, 8 + 20 * index)
            if offset + size > len(data): raise ValueError('Invalid architecture bounds')
            if (cpu, subtype) in result: raise ValueError('Duplicate architecture')
            result[cpu, subtype] = data[offset:offset + size]
        return result
    if data[:4] == b'\xcf\xfa\xed\xfe': return {struct.unpack_from('<II', data, 4): data}
    raise ValueError('Unexpected changed file format')

def payload(data):
    if data[:4] != b'\xcf\xfa\xed\xfe': raise ValueError('Expected 64-bit Mach-O')
    header = struct.unpack_from('<8I', data)
    count, length = header[4:6]
    if count > 4096 or 32 + length > len(data): raise ValueError('Invalid load commands')
    commands, sections = [], []
    cursor = 32
    for _ in range(count):
        command, size = struct.unpack_from('<II', data, cursor)
        if size < 8 or cursor + size > 32 + length: raise ValueError('Invalid command bounds')
        blob = data[cursor:cursor + size]
        if command == 0x19:  # LC_SEGMENT_64
            name = blob[8:24].rstrip(b'\0')
            number = struct.unpack_from('<I', blob, 64)[0]
            if 72 + number * 80 > size: raise ValueError('Invalid section count')
            for index in range(number):
                section = blob[72 + 80 * index:152 + 80 * index]
                section_size, offset = struct.unpack_from('<QI', section, 40)
                flags = struct.unpack_from('<I', section, 64)[0]
                if flags & 0xff not in (1, 0xc, 0x12):  # no on-disk bytes for zerofill
                    if offset + section_size > len(data): raise ValueError('Section outside file')
                    sections.append((section[:32].hex(), hashlib.sha256(data[offset:offset + section_size]).hexdigest()))
            if name == b'__LINKEDIT':
                # Only this segment's allocation/file sizes may change with the signature.
                modified = bytearray(blob)
                modified[32:40] = b'\0' * 8
                modified[48:56] = b'\0' * 8
                blob = bytes(modified)
        if command != 0x1d: commands.append(blob.hex())  # LC_CODE_SIGNATURE
        cursor += size
    if cursor != 32 + length: raise ValueError('Unexpected load-command data')
    # ncmds/sizeofcmds can change when a code-signature command is inserted.
    return {'header': header[:4] + header[6:], 'commands': commands, 'sections': sections}

def audit(original, signed):
    with zipfile.ZipFile(original) as before, tarfile.open(signed) as after:
        a = {m.filename: m for m in before.infolist() if not m.is_dir() and not m.filename.startswith('__MACOSX/')}
        b = {m.name: m for m in after.getmembers() if not m.isdir()}
        if set(a) != set(b): raise ValueError('Files added or removed')
        unchanged = 0; binaries = []; resources = []
        for name in sorted(a):
            old = before.read(a[name])
            new = b[name].linkname.encode() if b[name].issym() else after.extractfile(b[name]).read()
            if old == new: unchanged += 1; continue
            if stat.S_ISLNK(a[name].external_attr >> 16) or b[name].issym(): raise ValueError('Changed symbolic link')
            if '/_CodeSignature/' in name:
                if not name.endswith('/_CodeSignature/CodeResources'): raise ValueError('Unexpected signature file')
                resources.append(name); continue
            left, right = slices(old), slices(new)
            if set(left) != set(right): raise ValueError('Changed CPU architecture')
            for cpu in left:
                if payload(left[cpu]) != payload(right[cpu]): raise ValueError('Changed executable payload: ' + name)
            binaries.append(name)
        return {'unchangedFiles': unchanged, 'codeSectionsUnchanged': True, 'resignedBinaries': binaries, 'signatureResourceFiles': resources}

if __name__ == '__main__':
    p = argparse.ArgumentParser(); p.add_argument('original'); p.add_argument('signed'); p.add_argument('--report')
    args = p.parse_args(); result = audit(args.original, args.signed)
    text = json.dumps(result, indent=2)
    if args.report:
        with open(args.report, 'x', encoding='utf-8') as output: output.write(text)
    print(text)
