import React, { useState, useRef } from 'react';
import {
  Upload,
  FileText,
  Image as ImageIcon,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Download,
  Trash2,
  X,
  Plus,
  Play,
  Layers,
  FileCode,
  Sparkles,
  Files,
  Scissors
} from 'lucide-react';
import { ToolId, PDFImageTool, UserProfile } from '../types';
import {
  mergePDFs,
  splitPDF,
  compressPDF,
  convertPDFToImages,
  convertImagesToPDF,
  convertPDFToWord,
  convertWordToPDF,
  convertImageFormat,
  downloadBlob,
  getPDFPageCount,
  PDFPageImage
} from '../utils/toolEngine';
import { recordUsage, checkUsageLimit, formatBytes } from '../firebase';

interface WorkspaceProps {
  tool: PDFImageTool;
  userProfile: UserProfile | null;
  onOperationSuccess: () => void;
  onOpenSubscription: () => void;
  onClose: () => void;
}

export default function Workspace({
  tool,
  userProfile,
  onOperationSuccess,
  onOpenSubscription,
  onClose
}: WorkspaceProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultName, setResultName] = useState('');
  const [error, setError] = useState('');

  // Tool Specific Options
  const [splitPages, setSplitPages] = useState('1');
  const [pdfPageCount, setPdfPageCount] = useState(0);
  const [compressQuality, setCompressQuality] = useState(0.6);
  const [imgTargetFormat, setImgTargetFormat] = useState<'jpeg' | 'png' | 'webp'>('png');
  const [imgQuality, setImgQuality] = useState(0.85);
  const [wordText, setWordText] = useState('Type or paste your document text here...');
  const [renderedPDFImages, setRenderedPDFImages] = useState<PDFPageImage[]>([]);

  // Drag and Drop Ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addLog = (msg: string) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files) as File[];
      await processSelectedFiles(selectedFiles);
    }
  };

  const processSelectedFiles = async (selectedFiles: File[]) => {
    setError('');
    setResultBlob(null);
    setRenderedPDFImages([]);

    // Check acceptance
    const acceptedType = tool.acceptedFiles;
    let filtered = selectedFiles.filter((file) => {
      if (acceptedType === 'application/pdf') return file.type === 'application/pdf';
      if (acceptedType === 'image/*') return file.type.startsWith('image/');
      if (acceptedType === 'text/plain') return file.type === 'text/plain' || file.name.endsWith('.txt');
      return true;
    });

    if (filtered.length === 0) {
      setError(`Please select valid files. Accepted: ${tool.acceptedFiles}`);
      return;
    }

    // Limit files length
    if (filtered.length > tool.maxFiles) {
      filtered = filtered.slice(0, tool.maxFiles);
      addLog(`Capped list to maximum of ${tool.maxFiles} files for this tool.`);
    }

    let newFilesList = tool.maxFiles === 1 ? filtered : [...files, ...filtered];
    
    // De-duplicate if needed
    if (tool.maxFiles > 1) {
      const seenNames = new Set(files.map(f => f.name + f.size));
      newFilesList = [...files, ...filtered.filter(f => !seenNames.has(f.name + f.size))];
    }

    setFiles(newFilesList);

    // If split or PDF tools, extract total page count
    if (tool.id === 'split-pdf' && newFilesList.length > 0) {
      addLog(`Reading PDF metadata...`);
      const count = await getPDFPageCount(newFilesList[0]);
      setPdfPageCount(count);
      setSplitPages(`1-${count}`);
      addLog(`PDF loaded successfully. Total pages: ${count}`);
    } else {
      addLog(`Imported ${filtered.length} files successfully.`);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      const droppedFiles = Array.from(e.dataTransfer.files) as File[];
      await processSelectedFiles(droppedFiles);
    }
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
    if (files.length === 1) {
      setPdfPageCount(0);
      setResultBlob(null);
    }
  };

  const clearAll = () => {
    setFiles([]);
    setResultBlob(null);
    setLogs([]);
    setError('');
    setProgress(0);
    setRenderedPDFImages([]);
  };

  // MAIN RUN TASK METHOD
  const executeConversion = async () => {
    setError('');
    setResultBlob(null);
    setProcessing(true);
    setProgress(10);
    setLogs([]);
    addLog(`Starting tool: ${tool.name}...`);

    try {
      // 1. SECURITY & USAGE TRACKING CHECK
      const check = await checkUsageLimit(userProfile ? userProfile.uid : null);
      if (!check.allowed) {
        addLog(`Conversion blocked: Daily free usage limit of ${check.limit} reached!`);
        setError(`You have reached the free limit of 3 tools per day. Please upgrade to Pro for unlimited usage!`);
        onOpenSubscription();
        setProcessing(false);
        return;
      }

      addLog(`Usage slot verified successfully. Authorized.`);

      let processedBlob: Blob | null = null;
      let outputName = '';

      const mainFile = files[0];

      switch (tool.id) {
        case 'merge-pdf':
          if (files.length < 2) throw new Error("Select at least 2 PDF files to merge");
          addLog(`Parsing ${files.length} PDF binaries...`);
          setProgress(40);
          processedBlob = await mergePDFs(files);
          outputName = 'merged_document.pdf';
          setProgress(90);
          break;

        case 'split-pdf':
          if (!mainFile) throw new Error("Please upload a PDF file first");
          addLog(`Splitting document based on page range: ${splitPages}...`);
          setProgress(30);

          // Parse selected range
          const pages: number[] = [];
          const ranges = splitPages.split(',');
          for (const r of ranges) {
            if (r.includes('-')) {
              const [start, end] = r.split('-').map(Number);
              if (isNaN(start) || isNaN(end) || start > end) throw new Error(`Invalid range: ${r}`);
              for (let p = start; p <= end; p++) pages.push(p);
            } else {
              const p = Number(r);
              if (isNaN(p)) throw new Error(`Invalid page number: ${r}`);
              pages.push(p);
            }
          }

          processedBlob = await splitPDF(mainFile, pages);
          outputName = `extracted_pages_${pages.join('_')}.pdf`;
          setProgress(90);
          break;

        case 'compress-pdf':
          if (!mainFile) throw new Error("Please upload a PDF file first");
          addLog(`Reading original structure: size is ${formatBytes(mainFile.size)}...`);
          addLog(`Re-serializing layout with optimization standard...`);
          setProgress(40);
          processedBlob = await compressPDF(mainFile, compressQuality);
          outputName = `compressed_${mainFile.name}`;
          setProgress(90);
          break;

        case 'pdf-to-image':
          if (!mainFile) throw new Error("Please upload a PDF file first");
          addLog(`Preparing PDF canvas renderer...`);
          const imgList = await convertPDFToImages(mainFile, (cur, tot) => {
            setProgress(Math.floor((cur / tot) * 70) + 10);
            addLog(`Rendered page ${cur} of ${tot} to high-res canvas.`);
          });
          setRenderedPDFImages(imgList);
          addLog(`Extracted ${imgList.length} pages as high-quality images.`);
          setProgress(90);
          // Set standard first page as result file just in case they download default
          const response = await fetch(imgList[0].dataUrl);
          processedBlob = await response.blob();
          outputName = `${mainFile.name.replace('.pdf', '')}_page1.jpeg`;
          break;

        case 'image-to-pdf':
          if (files.length === 0) throw new Error("Please upload at least 1 image");
          addLog(`Embedding ${files.length} high-resolution canvas layers into single PDF...`);
          setProgress(45);
          processedBlob = await convertImagesToPDF(files);
          outputName = `converted_images.pdf`;
          setProgress(90);
          break;

        case 'pdf-to-word':
          if (!mainFile) throw new Error("Please upload a PDF file first");
          addLog(`Scanning text segments using standard parsing...`);
          setProgress(40);
          processedBlob = await convertPDFToWord(mainFile);
          outputName = `${mainFile.name.replace('.pdf', '')}_text.doc`;
          setProgress(90);
          break;

        case 'word-to-pdf':
          let wordFile = mainFile;
          if (!wordFile) {
            // Re-compile written text area to temporary text file
            addLog(`Compiling text area editor draft...`);
            wordFile = new File([wordText], 'written_document.txt', { type: 'text/plain' });
          }
          addLog(`Applying standard margins, layout grid, A4 measurements, and writing text...`);
          setProgress(40);
          processedBlob = await convertWordToPDF(wordFile);
          outputName = `${wordFile.name.replace('.txt', '')}.pdf`;
          setProgress(90);
          break;

        case 'image-converter':
          if (!mainFile) throw new Error("Please upload an image file first");
          addLog(`Decoding image buffer, scaling layout canvas...`);
          addLog(`Re-encoding to ${imgTargetFormat.toUpperCase()} format with quality ${Math.floor(imgQuality * 100)}%...`);
          setProgress(50);
          processedBlob = await convertImageFormat(mainFile, imgTargetFormat, imgQuality);
          outputName = `${mainFile.name.substring(0, mainFile.name.lastIndexOf('.'))}.${imgTargetFormat}`;
          setProgress(90);
          break;

        default:
          throw new Error("Invalid tool selected");
      }

      setProgress(100);
      addLog(`Processing complete! Size is ${processedBlob ? formatBytes(processedBlob.size) : 'N/A'}`);

      if (processedBlob) {
        setResultBlob(processedBlob);
        setResultName(outputName);
      }

      // 2. LOG / UPDATE REAL-TIME USAGE RECORD
      await recordUsage(
        userProfile ? userProfile.uid : null,
        tool.id,
        mainFile ? mainFile.name : 'Editor_Draft',
        mainFile ? mainFile.size : wordText.length
      );
      
      onOperationSuccess(); // Recheck limits and logs in navbar/dashboard

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Operation failed. Please ensure file formatting is compatible.');
      addLog(`Error encountered: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const triggerDownload = () => {
    if (resultBlob) {
      downloadBlob(resultBlob, resultName);
      addLog(`File downloaded: ${resultName}`);
    }
  };

  const triggerSingleImageDownload = (img: PDFPageImage) => {
    fetch(img.dataUrl)
      .then(r => r.blob())
      .then(b => downloadBlob(b, `${files[0].name.replace('.pdf', '')}_page_${img.pageNum}.jpeg`));
  };

  return (
    <div className="max-w-4xl mx-auto bg-slate-900 border border-slate-700/50 rounded-2xl shadow-xl overflow-hidden mt-6 animate-fade-in">
      {/* Workspace Header */}
      <div className="flex justify-between items-center px-6 py-4.5 bg-[#1E293B] border-b border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              {tool.name}
              {tool.badge && (
                <span className="px-2 py-0.5 text-[10px] font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 rounded-full uppercase">
                  {tool.badge}
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">{tool.description}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-6 md:p-8">
        {error && (
          <div className="flex items-start gap-3 p-4 mb-6 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Conversion Error</p>
              <p className="mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Input Phase */}
        {files.length === 0 && tool.id !== 'word-to-pdf' ? (
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center border-2 border-dashed border-slate-700 hover:border-indigo-500 hover:bg-indigo-500/5 cursor-pointer rounded-2xl py-12 px-6 text-center transition-all group"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              multiple={tool.maxFiles > 1}
              accept={tool.acceptedFiles}
              className="hidden"
            />
            <div className="w-12 h-12 rounded-full bg-slate-800 text-slate-400 group-hover:bg-indigo-500/10 group-hover:text-indigo-400 flex items-center justify-center mb-4 transition-all">
              <Upload className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-white">
              Drag & drop files here, or <span className="text-indigo-400">browse local drive</span>
            </p>
            <p className="text-xs text-slate-400 mt-1.5">
              Supports: {tool.acceptedFiles === 'application/pdf' ? 'PDF files' : tool.acceptedFiles === 'image/*' ? 'PNG, JPG, WEBP, GIF, BMP' : 'Plain Text (.txt)'} (Up to 100MB)
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Options Panel depending on Tool ID */}

            {/* Merge PDF File list and sorter */}
            {tool.id === 'merge-pdf' && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Documents to Merge</h4>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" /> Add PDF Files
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    multiple
                    accept="application/pdf"
                    className="hidden"
                  />
                </div>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {files.map((file, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 border border-slate-700/50 bg-slate-800/30 rounded-xl text-sm">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-5 h-5 flex items-center justify-center text-[10px] font-bold text-slate-450 bg-slate-800 border border-slate-700 rounded-full shrink-0">
                          {idx + 1}
                        </span>
                        <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="truncate text-slate-300 font-medium">{file.name}</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 ml-4">
                        <span className="text-xs text-slate-400 font-medium">{formatBytes(file.size)}</span>
                        <button
                          onClick={() => removeFile(idx)}
                          className="p-1 text-slate-450 hover:text-red-400 rounded-full hover:bg-slate-800 border border-transparent hover:border-slate-700 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Split PDF option panel */}
            {tool.id === 'split-pdf' && files.length > 0 && (
              <div className="p-4 bg-slate-800/20 border border-slate-700/50 rounded-xl space-y-3.5">
                <div className="flex items-center gap-2 text-white font-bold text-sm">
                  <Scissors className="w-4.5 h-4.5 text-indigo-400" />
                  <span>Configure Extraction Pages</span>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Enter Page Ranges (e.g. 1,3,5-7)
                    </label>
                    <input
                      type="text"
                      value={splitPages}
                      onChange={(e) => setSplitPages(e.target.value)}
                      placeholder="e.g., 1, 3, 5-7"
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-white"
                    />
                  </div>
                  <div className="flex items-end pb-1.5 text-xs text-slate-400">
                    <span>Selected PDF has <strong className="text-indigo-400">{pdfPageCount} pages</strong>. Pages not within limits will be automatically ignored.</span>
                  </div>
                </div>
              </div>
            )}

            {/* Compress PDF Option Panel */}
            {tool.id === 'compress-pdf' && files.length > 0 && (
              <div className="p-4 bg-slate-800/20 border border-slate-700/50 rounded-xl space-y-3">
                <div className="flex justify-between items-center text-sm font-semibold text-white">
                  <span>Compression Standard</span>
                  <span className="text-xs text-indigo-400 font-bold">
                    {compressQuality < 0.4 ? 'Maximum (Smaller size)' : compressQuality > 0.7 ? 'Low Loss (Better Quality)' : 'Balanced Standard'}
                  </span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="0.9"
                  step="0.1"
                  value={compressQuality}
                  onChange={(e) => setCompressQuality(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wide">
                  <span>Extreme Compression</span>
                  <span>Balanced</span>
                  <span>Visual Lossless</span>
                </div>
              </div>
            )}

            {/* Image to PDF multiple images layout */}
            {tool.id === 'image-to-pdf' && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Canvas Image Order</h4>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" /> Add Images
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    multiple
                    accept="image/*"
                    className="hidden"
                  />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {files.map((file, idx) => {
                    const localUrl = URL.createObjectURL(file);
                    return (
                      <div key={idx} className="relative aspect-square border border-slate-700 bg-slate-800 rounded-xl overflow-hidden group">
                        <img
                          src={localUrl}
                          className="w-full h-full object-cover"
                          alt={file.name}
                        />
                        <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all gap-1.5">
                          <button
                            onClick={() => removeFile(idx)}
                            className="p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-full transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <span className="absolute bottom-2 left-2 px-1.5 py-0.5 bg-slate-950/70 text-[9px] font-bold text-white rounded">
                          Page {idx + 1}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Word to PDF Editor Option */}
            {tool.id === 'word-to-pdf' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Document Text Editor</h4>
                  {files.length > 0 ? (
                    <button
                      onClick={clearAll}
                      className="text-xs font-semibold text-red-400 hover:text-red-300 flex items-center gap-1"
                    >
                      <Trash2 className="w-4 h-4" /> Clear Imported File ({files[0].name})
                    </button>
                  ) : (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                    >
                      <Upload className="w-4 h-4" /> Upload Word/Text File
                    </button>
                  )}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".txt"
                    className="hidden"
                  />
                </div>

                {files.length === 0 ? (
                  <textarea
                    rows={8}
                    value={wordText}
                    onChange={(e) => setWordText(e.target.value)}
                    className="w-full p-4 border border-slate-700 bg-slate-800/50 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 placeholder:text-slate-500 font-mono text-white"
                  />
                ) : (
                  <div className="p-4 bg-slate-800/30 border border-slate-700/50 rounded-xl flex items-center gap-3">
                    <FileText className="w-8 h-8 text-indigo-400" />
                    <div>
                      <p className="text-sm font-semibold text-white">{files[0].name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{formatBytes(files[0].size)} • Will compile straight to PDF A4 layout</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Image Format Converter option panel */}
            {tool.id === 'image-converter' && files.length > 0 && (
              <div className="p-5 bg-slate-800/20 border border-slate-700/50 rounded-xl space-y-4">
                <div className="flex items-center gap-2 text-white font-bold text-sm">
                  <RefreshCw className="w-4.5 h-4.5 text-indigo-400" />
                  <span>Conversion Rules</span>
                </div>
                <div className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                      Target Format
                    </label>
                    <div className="flex gap-2">
                      {(['png', 'jpeg', 'webp'] as const).map((fmt) => (
                        <button
                          key={fmt}
                          type="button"
                          onClick={() => setImgTargetFormat(fmt)}
                          className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase border transition-all ${
                            imgTargetFormat === fmt
                              ? 'bg-indigo-500 border-indigo-500 text-white shadow-md shadow-indigo-500/10'
                              : 'bg-slate-800 border-slate-750 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          {fmt === 'jpeg' ? 'JPG/JPEG' : fmt}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex justify-between">
                      <span>Encoding Quality</span>
                      <span className="text-indigo-400 font-bold font-mono">{Math.floor(imgQuality * 100)}%</span>
                    </label>
                    <input
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.05"
                      value={imgQuality}
                      disabled={imgTargetFormat === 'png'}
                      onChange={(e) => setImgQuality(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-750 rounded-lg appearance-none cursor-pointer accent-indigo-500 disabled:opacity-40"
                    />
                    <div className="flex justify-between text-[9px] text-slate-400 font-bold mt-1 uppercase tracking-wide">
                      <span>Low Bandwidth</span>
                      <span>High Fidelity</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Shared File List Preview for Single File tools */}
            {tool.maxFiles === 1 && files.length > 0 && tool.id !== 'word-to-pdf' && (
              <div className="flex justify-between items-center p-3.5 border border-slate-700/50 bg-slate-800/30 rounded-xl text-sm">
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileText className="w-5 h-5 text-indigo-400 shrink-0" />
                  <span className="truncate text-slate-300 font-medium">{files[0].name}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-4">
                  <span className="text-xs text-slate-400 font-semibold">{formatBytes(files[0].size)}</span>
                  <button
                    onClick={() => removeFile(0)}
                    className="p-1 text-slate-450 hover:text-red-400 rounded-full hover:bg-slate-800 border border-transparent hover:border-slate-700 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Action Trigger Row */}
            <div className="flex gap-3 justify-end pt-2 border-t border-slate-800">
              <button
                onClick={clearAll}
                disabled={processing}
                className="px-5 py-2.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-xl transition-all"
              >
                Clear Tool Workspace
              </button>
              <button
                onClick={executeConversion}
                disabled={processing || (files.length === 0 && tool.id !== 'word-to-pdf')}
                className="px-6 py-2.5 bg-indigo-550 hover:bg-indigo-600 active:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-500/15 hover:shadow-indigo-550/25 transition-all flex items-center gap-1.5"
              >
                {processing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Executing Conversion ({progress}%)</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    <span>Run Conversion Engine</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Process Logs / Terminal */}
        {logs.length > 0 && (
          <div className="mt-6 border border-slate-800 rounded-xl overflow-hidden shadow-inner">
            <div className="flex items-center gap-2 bg-slate-950 px-4 py-2.5 text-slate-400 border-b border-slate-800/80">
              <FileCode className="w-4 h-4 text-emerald-500" />
              <span className="text-[10px] font-mono uppercase font-bold tracking-wider">Secure Sandbox Logger</span>
            </div>
            <div className="p-4 bg-slate-900 font-mono text-xs text-slate-300 max-h-40 overflow-y-auto space-y-1 scrollbar-thin">
              {logs.map((log, idx) => (
                <div key={idx} className="leading-relaxed flex items-start gap-1">
                  <span className="text-slate-600 select-none">&gt;</span>
                  <span>{log}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Output PDF To Image Specific Grid renderer */}
        {tool.id === 'pdf-to-image' && renderedPDFImages.length > 0 && (
          <div className="mt-8 space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Rendered High-Res Pages</h4>
              <p className="text-xs text-slate-455">Total pages rendered: {renderedPDFImages.length}</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {renderedPDFImages.map((img) => (
                <div key={img.pageNum} className="border border-slate-700 rounded-xl overflow-hidden bg-slate-800 flex flex-col shadow-sm relative group">
                  <div className="aspect-[3/4] overflow-hidden bg-[#1E293B] flex items-center justify-center border-b border-slate-700">
                    <img
                      src={img.dataUrl}
                      alt={`Page ${img.pageNum}`}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="p-2.5 flex justify-between items-center bg-slate-800">
                    <span className="text-xs font-bold text-slate-300">Page {img.pageNum}</span>
                    <button
                      onClick={() => triggerSingleImageDownload(img)}
                      className="p-1.5 bg-indigo-500/10 hover:bg-indigo-500 text-indigo-400 hover:text-white rounded-lg transition-colors border border-indigo-500/20 hover:border-indigo-500"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Generic Successful Result Banner */}
        {resultBlob && tool.id !== 'pdf-to-image' && (
          <div className="mt-8 p-6 border-2 border-emerald-500/70 bg-emerald-500/5 rounded-2xl animate-fade-in flex flex-col md:flex-row items-center justify-between gap-5">
            <div className="flex items-center gap-4.5">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
                <CheckCircle className="w-6 h-6 animate-pulse" />
              </div>
              <div className="min-w-0">
                <h4 className="text-base font-extrabold text-white">Conversion Success!</h4>
                <p className="text-xs text-slate-400 mt-1 truncate max-w-[280px] sm:max-w-[400px]">
                  Ready to download: <strong className="text-emerald-400">{resultName}</strong>
                </p>
                <div className="flex items-center gap-2.5 mt-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400 bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded">
                    Size: {formatBytes(resultBlob.size)}
                  </span>
                  {files[0] && files[0].size > resultBlob.size && (
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                      -{Math.round(((files[0].size - resultBlob.size) / files[0].size) * 100)}% Compressed
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={triggerDownload}
              className="w-full md:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/10 hover:shadow-emerald-600/20 transition-all text-xs flex items-center justify-center gap-2 shrink-0 animate-bounce"
            >
              <Download className="w-4 h-4" /> Download Compiled File
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
