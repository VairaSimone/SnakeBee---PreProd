import fs from 'fs/promises';
import path from 'path';

export const deleteFileIfExists = async (filePath) => {
  try {
    // Rendi il path assoluto (se è relativo tipo "/uploads/xyz.jpg")
    const fullPath = path.join(process.cwd(), filePath.replace(/^\/+/, ''));

    await fs.access(fullPath);
    await fs.unlink(fullPath);
    console.log(`🗑️  File eliminato: ${fullPath}`);
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.warn(`Errore nel cancellare ${filePath}:`, err.message);
    }
  }
};
