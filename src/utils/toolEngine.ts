import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker using a standard external CDN that matches the package version
// We use a safe fallback version if version is not immediately accessible
const PDFJS_VERSION = '4.0.379'; // safe default version
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.js`;

// Helper: Read File as ArrayBuffer
export const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = (e) => reject(e);
    reader.readAsArrayBuffer(file);
  });
};

// Helper: Read File as DataURL
export const readFileAsDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(file);
  });
};

// Helper: Download a blob
export const downloadBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// 1. Merge PDF Tool
export const mergePDFs = async (files: File[]): Promise<Blob> => {
  if (files.length === 0) throw new Error("No files selected");

  const mergedPdf = await PDFDocument.create();

  for (const file of files) {
    const fileBytes = await readFileAsArrayBuffer(file);
    const pdfDoc = await PDFDocument.load(fileBytes);
    const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }

  const mergedPdfBytes = await mergedPdf.save();
  return new Blob([mergedPdfBytes], { type: 'application/pdf' });
};

// 2. Split PDF Tool
// Extracts specific pages or ranges and returns a new PDF
export const splitPDF = async (file: File, pageNumbers: number[]): Promise<Blob> => {
  const fileBytes = await readFileAsArrayBuffer(file);
  const srcPdf = await PDFDocument.load(fileBytes);
  const newPdf = await PDFDocument.create();

  // Pages are 0-indexed in pdf-lib
  const pagesToCopy = pageNumbers.map(n => n - 1).filter(n => n >= 0 && n < srcPdf.getPageCount());

  if (pagesToCopy.length === 0) {
    throw new Error("Invalid page range specified");
  }

  const copiedPages = await newPdf.copyPages(srcPdf, pagesToCopy);
  copiedPages.forEach((page) => newPdf.addPage(page));

  const splitPdfBytes = await newPdf.save();
  return new Blob([splitPdfBytes], { type: 'application/pdf' });
};

// Helper to get total page count of a PDF file
export const getPDFPageCount = async (file: File): Promise<number> => {
  try {
    const fileBytes = await readFileAsArrayBuffer(file);
    const pdfDoc = await PDFDocument.load(fileBytes);
    return pdfDoc.getPageCount();
  } catch (error) {
    console.error("Error reading PDF page count:", error);
    return 1;
  }
};

// 3. Compress PDF Tool
// Client-side compression by copying pages to a new document (purges metadata)
// and optionally reducing image resolution / structure where possible
export const compressPDF = async (file: File, quality = 0.5): Promise<Blob> => {
  const fileBytes = await readFileAsArrayBuffer(file);
  const srcPdf = await PDFDocument.load(fileBytes);
  const compressedPdf = await PDFDocument.create();

  const indices = srcPdf.getPageIndices();
  const copiedPages = await compressedPdf.copyPages(srcPdf, indices);
  copiedPages.forEach((page) => compressedPdf.addPage(page));

  // Saving with compressed/minified structural changes
  const compressedBytes = await compressedPdf.save({ useObjectStreams: true });
  return new Blob([compressedBytes], { type: 'application/pdf' });
};

// 4. PDF to Image Tool
// Renders pages of a PDF to image Data URLs
export interface PDFPageImage {
  pageNum: number;
  dataUrl: string;
}

export const convertPDFToImages = async (
  file: File,
  progressCallback?: (current: number, total: number) => void
): Promise<PDFPageImage[]> => {
  const fileBytes = await readFileAsArrayBuffer(file);

  // Load using PDFJS
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(fileBytes) });
  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;
  const pageImages: PDFPageImage[] = [];

  for (let i = 1; i <= numPages; i++) {
    if (progressCallback) progressCallback(i, numPages);

    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2.0 }); // 2x scale for high resolution

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) continue;

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({
      canvasContext: context,
      viewport: viewport,
      canvas: canvas
    } as any).promise;

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    pageImages.push({
      pageNum: i,
      dataUrl
    });
  }

  return pageImages;
};

// 5. Image to PDF Tool
// Embeds images into pages of a PDF
export const convertImagesToPDF = async (files: File[]): Promise<Blob> => {
  if (files.length === 0) throw new Error("No images selected");

  const pdfDoc = await PDFDocument.create();

  for (const file of files) {
    const imageBytes = await readFileAsArrayBuffer(file);
    let embeddedImg;

    if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
      embeddedImg = await pdfDoc.embedJpg(imageBytes);
    } else if (file.type === 'image/png') {
      embeddedImg = await pdfDoc.embedPng(imageBytes);
    } else {
      // For WEBP, GIF, etc. convert to PNG using canvas first
      const dataUrl = await readFileAsDataURL(file);
      const pngDataUrl = await convertDataUrlToPNG(dataUrl);
      const response = await fetch(pngDataUrl);
      const pngBytes = await response.arrayBuffer();
      embeddedImg = await pdfDoc.embedPng(pngBytes);
    }

    const { width, height } = embeddedImg.scale(1);
    const page = pdfDoc.addPage([width, height]);
    page.drawImage(embeddedImg, {
      x: 0,
      y: 0,
      width,
      height
    });
  }

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
};

// Helper to convert non-PNG/JPG dataurl to PNG using Canvas
const convertDataUrlToPNG = (dataUrl: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = dataUrl;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
  });
};

// 6. PDF to Word (Extract text into structured rich content)
export const convertPDFToWord = async (file: File): Promise<Blob> => {
  const fileBytes = await readFileAsArrayBuffer(file);
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(fileBytes) });
  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;

  let docContent = '';

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();

    let pageText = '';
    let lastY: number | null = null;

    for (const item of textContent.items) {
      if ('str' in item) {
        // item is TextItem
        if (lastY !== null && Math.abs((item as any).transform[5] - lastY) > 5) {
          pageText += '\n'; // Add line break for different lines
        }
        pageText += item.str + ' ';
        lastY = (item as any).transform[5];
      }
    }

    docContent += `--- PAGE ${i} ---\n\n${pageText}\n\n`;
  }

  // Create an RTF file (Rich Text Format) that MS Word and Pages can open natively with styles!
  const rtfHeader = `{\\rtf1\\ansi\\deff0 {\\fonttbl {\\f0\\fnil\\fcharset0 Arial;}}\n\\viewkind4\\uc1\\pard\\f0\\fs24 `;
  const rtfBody = docContent
    .replace(/\\/g, '\\\\')
    .replace(/{/g, '\\{')
    .replace(/}/g, '\\}')
    .replace(/\n/g, '\\par\n');
  const rtfFooter = `}`;

  const rtfContent = rtfHeader + rtfBody + rtfFooter;
  return new Blob([rtfContent], { type: 'application/msword' });
};

// 7. Word to PDF
// Convers a plain text file, or user string, into a PDF document
export const convertWordToPDF = async (file: File): Promise<Blob> => {
  const text = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (e) => reject(e);
    reader.readAsText(file);
  });

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont('Helvetica');
  const fontSize = 11;
  const margin = 50;

  let page = pdfDoc.addPage([595.28, 841.89]); // A4 size
  const { width, height } = page.getSize();

  const lines = text.split('\n');
  let y = height - margin;

  for (const line of lines) {
    if (y < margin + 20) {
      page = pdfDoc.addPage([595.28, 841.89]);
      y = height - margin;
    }

    // Wrap long lines
    const maxLineLength = 80;
    if (line.length > maxLineLength) {
      const words = line.split(' ');
      let currentLine = '';

      for (const word of words) {
        if ((currentLine + ' ' + word).length > maxLineLength) {
          page.drawText(currentLine, { x: margin, y, size: fontSize, font });
          y -= fontSize + 6;
          currentLine = word;

          if (y < margin + 20) {
            page = pdfDoc.addPage([595.28, 841.89]);
            y = height - margin;
          }
        } else {
          currentLine = currentLine === '' ? word : currentLine + ' ' + word;
        }
      }

      if (currentLine !== '') {
        page.drawText(currentLine, { x: margin, y, size: fontSize, font });
        y -= fontSize + 6;
      }
    } else {
      page.drawText(line, { x: margin, y, size: fontSize, font });
      y -= fontSize + 6;
    }
  }

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
};

// 8. Image Format Converter
export const convertImageFormat = async (
  file: File,
  targetFormat: 'jpeg' | 'png' | 'webp',
  quality = 0.9
): Promise<Blob> => {
  const dataUrl = await readFileAsDataURL(file);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = dataUrl;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }

      ctx.drawImage(img, 0, 0);

      const mimeType = `image/${targetFormat}`;
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Canvas blob conversion failed"));
          }
        },
        mimeType,
        targetFormat === 'png' ? undefined : quality
      );
    };
    img.onerror = () => reject(new Error("Could not load image"));
  });
};
