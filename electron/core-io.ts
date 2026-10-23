import nodeFs from 'node:fs';
// Electron's regular fs treats .asar as a virtual directory. Verification and
// atomic file operations must inspect the physical archive, not that directory.
export const coreFs:typeof nodeFs=process.versions.electron?require('original-fs'):nodeFs;
