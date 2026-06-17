import { useCallback, useState } from 'react';
import { Upload, FileSpreadsheet, AlertCircle } from 'lucide-react';

interface Props {
  onFileLoaded: (data: ArrayBuffer, fileName: string) => void;
  isLoading?: boolean;
}

export function FileDropZone({ onFileLoaded, isLoading }: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback((file: File) => {
    setError(null);
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setError('Alleen Excel-bestanden (.xlsx) worden ondersteund.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result instanceof ArrayBuffer) {
        onFileLoaded(e.target.result, file.name);
      }
    };
    reader.onerror = () => setError('Fout bij het lezen van het bestand.');
    reader.readAsArrayBuffer(file);
  }, [onFileLoaded]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => setIsDragging(false), []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-200
          ${isDragging
            ? 'border-cfe-green bg-cfe-green/5 scale-[1.02]'
            : 'border-slate-200 hover:border-cfe-green/50 hover:bg-slate-50'
          }
          ${isLoading ? 'pointer-events-none opacity-60' : ''}
        `}
      >
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={handleInputChange}
          className="absolute inset-0 opacity-0 cursor-pointer"
          disabled={isLoading}
        />

        <div className="flex flex-col items-center gap-4">
          {isLoading ? (
            <>
              <div className="w-16 h-16 rounded-2xl bg-cfe-green/10 flex items-center justify-center animate-pulse-gentle">
                <FileSpreadsheet className="w-8 h-8 text-cfe-green" />
              </div>
              <div>
                <p className="text-lg font-semibold text-slate-700">Bestand wordt geanalyseerd…</p>
                <p className="text-sm text-slate-400 mt-1">Even geduld, de data wordt geclusterd en verwerkt.</p>
              </div>
            </>
          ) : (
            <>
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors
                ${isDragging ? 'bg-cfe-green/20' : 'bg-slate-100'}`}
              >
                <Upload className={`w-8 h-8 transition-colors ${isDragging ? 'text-cfe-green' : 'text-slate-400'}`} />
              </div>
              <div>
                <p className="text-lg font-semibold text-slate-700">
                  Sleep je GeoDynamics Excel-bestand hierheen
                </p>
                <p className="text-sm text-slate-400 mt-1">
                  Of klik om een bestand te selecteren (.xlsx)
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-4 flex items-center gap-2 text-red-600 text-sm bg-red-50 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}
