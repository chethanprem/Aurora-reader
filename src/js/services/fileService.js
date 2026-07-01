// =====================================================
// fileService.js
// Handles picking files from the device and scanning common
// folders (Downloads/Documents) for PDFs/EPUBs, then copying
// them into the app's private storage (Directory.Data) so the
// library keeps working even if the original file is moved
// or the SD card is removed.
//
// Uses:
//  - @capawesome/capacitor-file-picker  -> native "pick file" UI
//  - @capacitor/filesystem              -> read/write/scan device storage
// Both gracefully no-op with helpful errors when running outside
// a native shell (e.g. testing in a desktop browser).
// =====================================================

const SUPPORTED_EXT = ['pdf']; // epub support can be added behind the same interface later

async function getFilePicker() {
  try {
    const mod = await import('@capawesome/capacitor-file-picker');
    return mod.FilePicker;
  } catch (e) {
    return null;
  }
}

async function getFilesystem() {
  try {
    const mod = await import('@capacitor/filesystem');
    return { Filesystem: mod.Filesystem, Directory: mod.Directory };
  } catch (e) {
    return null;
  }
}

function extOf(name = '') {
  return name.split('.').pop().toLowerCase();
}

function idFromName(name) {
  return `bk_${name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${Date.now()}`;
}

export const fileService = {
  /**
   * Opens the native file picker and lets the user choose one or more
   * PDF files from anywhere on the device (Downloads, Drive-synced
   * folders, etc). Returns raw picked file descriptors with base64 data.
   */
  async pickFiles() {
    const FilePicker = await getFilePicker();
    if (!FilePicker) {
      throw new Error('File picker is only available in the installed Android app.');
    }
    const result = await FilePicker.pickFiles({
      types: ['application/pdf'],
      multiple: true,
      readData: true, // gives us base64 so we can copy into app storage
    });
    return result.files.filter((f) => SUPPORTED_EXT.includes(extOf(f.name)));
  },

  /**
   * Copies a picked file into the app's private Documents directory
   * (survives reinstall of the picker source, works offline) and
   * returns a book record ready to insert into the library.
   */
  async importPickedFile(pickedFile) {
    const fs = await getFilesystem();
    const id = idFromName(pickedFile.name);
    const destPath = `books/${id}.pdf`;

    if (fs) {
      await fs.Filesystem.mkdir({ path: 'books', directory: fs.Directory.Data, recursive: true }).catch(() => {});
      await fs.Filesystem.writeFile({
        path: destPath,
        directory: fs.Directory.Data,
        data: pickedFile.data, // base64
      });
      const { uri } = await fs.Filesystem.getUri({ path: destPath, directory: fs.Directory.Data });
      return {
        id,
        title: pickedFile.name.replace(/\.pdf$/i, ''),
        author: 'Unknown',
        format: 'pdf',
        fileUri: uri,
        sizeBytes: pickedFile.size || null,
        favorite: false,
        progress: 0,
        lastPage: 1,
        totalPages: null,
        addedAt: Date.now(),
      };
    }

    // Browser fallback: keep the base64 inline so the demo still works
    return {
      id,
      title: pickedFile.name.replace(/\.pdf$/i, ''),
      author: 'Unknown',
      format: 'pdf',
      fileUri: `data:application/pdf;base64,${pickedFile.data}`,
      sizeBytes: pickedFile.size || null,
      favorite: false,
      progress: 0,
      lastPage: 1,
      totalPages: null,
      addedAt: Date.now(),
    };
  },

  /**
   * Scans the device's public Documents/Download folders for PDF files
   * the user hasn't imported yet. Requires storage permission, which
   * Filesystem.requestPermissions() will prompt for on first use.
   */
  async scanDeviceForPdfs() {
    const fs = await getFilesystem();
    if (!fs) throw new Error('Device scanning is only available in the installed Android app.');

    await fs.Filesystem.requestPermissions().catch(() => {});
    const foldersToScan = [fs.Directory.Documents, fs.Directory.ExternalStorage];
    const found = [];

    for (const directory of foldersToScan) {
      try {
        const { files } = await fs.Filesystem.readdir({ path: '', directory });
        for (const entry of files) {
          if (entry.type === 'file' && extOf(entry.name) === 'pdf') {
            found.push({ name: entry.name, uri: entry.uri, size: entry.size, directory });
          }
        }
      } catch (e) {
        // folder not accessible on this device/OS version — skip quietly
      }
    }
    return found;
  },

  /** Reads a stored book's PDF bytes back out as a Uint8Array for pdf.js */
  async readBookBytes(book) {
    const fs = await getFilesystem();
    if (book.fileUri?.startsWith('data:')) {
      const base64 = book.fileUri.split(',')[1];
      return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    }
    if (fs) {
      const { data } = await fs.Filesystem.readFile({ path: book.fileUri });
      return Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
    }
    throw new Error('Unable to read book file.');
  },
};
