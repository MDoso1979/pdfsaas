import {
  FilePlus,
  Scissors,
  Minimize,
  Image,
  FileText,
  FileCode,
  RefreshCw,
  FolderOpen
} from 'lucide-react';
import { PDFImageTool, ToolId } from '../types';

export const TOOLS: PDFImageTool[] = [
  {
    id: 'merge-pdf',
    name: 'Merge PDF',
    description: 'Combine multiple PDF documents into a single organized file.',
    category: 'pdf',
    iconName: 'FilePlus',
    acceptedFiles: 'application/pdf',
    maxFiles: 20
  },
  {
    id: 'split-pdf',
    name: 'Split PDF',
    description: 'Extract specific pages or page ranges from your PDF into a new document.',
    category: 'pdf',
    iconName: 'Scissors',
    acceptedFiles: 'application/pdf',
    maxFiles: 1
  },
  {
    id: 'compress-pdf',
    name: 'Compress PDF',
    description: 'Optimize PDF structure and assets to significantly reduce file size.',
    category: 'pdf',
    iconName: 'Minimize',
    badge: 'Optimized',
    acceptedFiles: 'application/pdf',
    maxFiles: 1
  },
  {
    id: 'pdf-to-image',
    name: 'PDF to Image',
    description: 'Render and extract PDF pages into high-resolution JPG or PNG frames.',
    category: 'convert',
    iconName: 'Image',
    acceptedFiles: 'application/pdf',
    maxFiles: 1
  },
  {
    id: 'image-to-pdf',
    name: 'Image to PDF',
    description: 'Convert and embed PNG, JPG, or WEBP images into an A4 PDF document.',
    category: 'pdf',
    iconName: 'FileText',
    acceptedFiles: 'image/*',
    maxFiles: 15
  },
  {
    id: 'pdf-to-word',
    name: 'PDF to Word',
    description: 'Extract raw text layouts and generate a formatted Word Document format.',
    category: 'convert',
    iconName: 'FileCode',
    badge: 'AI Powered',
    acceptedFiles: 'application/pdf',
    maxFiles: 1
  },
  {
    id: 'word-to-pdf',
    name: 'Word to PDF',
    description: 'Type plain text or upload documents to instantly compile into an A4 PDF layout.',
    category: 'convert',
    iconName: 'FileText',
    acceptedFiles: 'text/plain',
    maxFiles: 1
  },
  {
    id: 'image-converter',
    name: 'Image Converter',
    description: 'Convert images between WEBP, PNG, and JPG formats with quality controls.',
    category: 'image',
    iconName: 'RefreshCw',
    badge: 'Fast',
    acceptedFiles: 'image/*',
    maxFiles: 1
  }
];

interface ToolGridProps {
  onSelectTool: (tool: PDFImageTool) => void;
  activeToolId?: ToolId;
}

export default function ToolGrid({ onSelectTool, activeToolId }: ToolGridProps) {
  
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'FilePlus': return <FilePlus className="w-5 h-5" />;
      case 'Scissors': return <Scissors className="w-5 h-5" />;
      case 'Minimize': return <Minimize className="w-5 h-5" />;
      case 'Image': return <Image className="w-5 h-5" />;
      case 'FileText': return <FileText className="w-5 h-5" />;
      case 'FileCode': return <FileCode className="w-5 h-5" />;
      case 'RefreshCw': return <RefreshCw className="w-5 h-5" />;
      default: return <FolderOpen className="w-5 h-5" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
            Workspace Tools
          </h2>
          <p className="text-xs text-slate-400 mt-1">Select any compiler to process your documents securely.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {TOOLS.map((tool) => {
          const isActive = activeToolId === tool.id;
          return (
            <div
              key={tool.id}
              onClick={() => onSelectTool(tool)}
              className={`flex flex-col p-5 bg-slate-800/40 border rounded-2xl cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg relative group ${
                isActive
                  ? 'border-indigo-500 ring-2 ring-indigo-500/15 shadow-indigo-500/5'
                  : 'border-slate-700/50 hover:border-indigo-500/50 shadow-sm hover:bg-slate-800'
              }`}
            >
              {tool.badge && (
                <span className="absolute top-4 right-4 px-2 py-0.5 text-[9px] font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 rounded-full uppercase tracking-wider">
                  {tool.badge}
                </span>
              )}

              {/* Icon */}
              <div className={`p-2.5 rounded-xl w-10 h-10 flex items-center justify-center transition-colors ${
                isActive ? 'bg-indigo-500 text-white' : 'bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white'
              }`}>
                {getIcon(tool.iconName)}
              </div>

              <h3 className="text-sm font-bold text-white mt-4 group-hover:text-indigo-400 transition-colors">
                {tool.name}
              </h3>
              <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed flex-1">
                {tool.description}
              </p>

              <div className="flex items-center gap-1.5 mt-4 text-[10px] font-bold text-indigo-400 uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
                <span>Configure Tool</span>
                <span>→</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
