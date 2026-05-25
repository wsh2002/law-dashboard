import mammoth from 'mammoth';

const STYLE_FILE_EXTENSIONS = ['.txt', '.md', '.docx'] as const;

export function isSupportedStyleFileName(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return STYLE_FILE_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export async function readStyleFileAsText(file: File): Promise<string> {
  const lower = file.name.toLowerCase();
  if (lower.endsWith('.docx')) {
    const arrayBuffer = await file.arrayBuffer();
    const { value } = await mammoth.extractRawText({ arrayBuffer });
    return value;
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(typeof reader.result === 'string' ? reader.result : '');
    };
    reader.onerror = () => reject(new Error('read failed'));
    reader.readAsText(file, 'UTF-8');
  });
}
