import { useCallback, useState } from "react";

interface Props {
  onFileSelect: (file: File) => void;
}

export default function FileUpload({ onFileSelect }: Props) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  }, [onFileSelect]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files[0]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      document.getElementById('fileInput')?.click();
    }
  };

  return (
    <label 
      role="button"
      tabIndex={0}
      onDrop={handleDrop} 
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onKeyDown={handleKeyDown}
      aria-label="Drag and drop a file, or click to browse"
      className="w-full h-full absolute inset-0 flex flex-col items-center justify-center cursor-pointer group p-12"
    >
      <input 
        id="fileInput" 
        type="file" 
        className="hidden" 
        onChange={handleFileSelect} 
        aria-label="Upload file"
        tabIndex={-1}
      />
      <div className={`w-full max-w-xl aspect-video rounded-3xl border-4 border-dashed transition-all duration-300 flex flex-col items-center justify-center bg-mocha-surface0/30 ${isDragging ? 'border-mocha-blue scale-105 bg-mocha-blue/10' : 'border-mocha-surface1 group-hover:border-mocha-blue group-hover:bg-mocha-surface0/50'}`}>
        <div className="w-16 h-16 rounded-full bg-mocha-blue text-mocha-base flex items-center justify-center text-4xl mb-6 shadow-lg shadow-(--color-mocha-blue)/20 transition-transform group-hover:scale-110">
          +
        </div>
        <h1 className="text-3xl font-medium text-mocha-text tracking-tight">
          Drag & Drop a file
        </h1>
        <p className="mt-2 text-neutral-400 font-light">or click to browse</p>
      </div>
    </label>
  );
}
