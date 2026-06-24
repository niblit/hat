"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { WorkerMessage, WorkerResponse } from "../worker/crypto.worker";

type Step = 1 | 2 | 3 | 4;

export default function Home() {
  const [step, setStep] = useState<Step>(1);
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isEncrypting, setIsEncrypting] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  
  const [progress, setProgress] = useState(0);
  const [eta, setEta] = useState("");
  
  const [errorMsg, setErrorMsg] = useState("");
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [finalFileName, setFinalFileName] = useState("");

  const workerRef = useRef<Worker | null>(null);
  const isWorkerReady = useRef(false);

  // Refs to avoid stale closures in worker onmessage
  const fileRef = useRef<File | null>(null);
  const isEncryptingRef = useRef<boolean>(true);

  // Stats for ETA calculation
  const startTime = useRef<number>(0);
  const bytesProcessed = useRef<number>(0);
  const totalBytes = useRef<number>(0);

  // Buffers for stitching output
  const outputChunks = useRef<Blob[]>([]);

  useEffect(() => {
    workerRef.current = new Worker(new URL('../worker/crypto.worker.ts', import.meta.url), { type: 'module' });
    
    workerRef.current.onmessage = (e: MessageEvent<WorkerResponse>) => {
      const msg = e.data;
      switch (msg.type) {
        case 'initialized':
          isWorkerReady.current = true;
          break;
        case 'error':
          handleError(msg.message);
          break;
        case 'encrypt_started':
          outputChunks.current = [new Blob([msg.header as any])];
          processNextChunk();
          break;
        case 'decrypt_started':
          outputChunks.current = [];
          processNextChunk();
          break;
        case 'chunk_encrypted':
        case 'chunk_decrypted':
          outputChunks.current.push(new Blob([msg.chunk as any]));
          updateProgress();
          
          if (bytesProcessed.current >= totalBytes.current) {
            finishProcessing();
          } else {
            processNextChunk();
          }
          break;
      }
    };

    workerRef.current.postMessage({ type: 'init' } as WorkerMessage);

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const handleError = (msg: string) => {
    setErrorMsg(msg);
    setStep(4);
  };

  const startProcessing = async () => {
    if (!file || !workerRef.current) return;
    
    fileRef.current = file;
    
    setStep(3);
    startTime.current = performance.now();
    bytesProcessed.current = 0;
    totalBytes.current = file.size;
    setProgress(0);
    setEta("Calculating...");

    if (file.name.endsWith('.hat')) {
      setIsEncrypting(false);
      isEncryptingRef.current = false;
      // It's a decrypt operation. Read header first (105 bytes)
      const headerBlob = file.slice(0, 105);
      const headerBuffer = await headerBlob.arrayBuffer();
      const headerBytes = new Uint8Array(headerBuffer);
      
      // The rest is the payload
      totalBytes.current = file.size - 105; 
      
      workerRef.current.postMessage({ 
        type: 'start_decrypt', 
        password, 
        header: headerBytes 
      } as WorkerMessage);
    } else {
      setIsEncrypting(true);
      isEncryptingRef.current = true;
      workerRef.current.postMessage({ 
        type: 'start_encrypt', 
        password 
      } as WorkerMessage);
    }
  };

  const processNextChunk = async () => {
    const currentFile = fileRef.current;
    if (!currentFile || !workerRef.current) return;

    const offset = isEncryptingRef.current ? bytesProcessed.current : bytesProcessed.current + 105;
    const chunkSize = isEncryptingRef.current ? 10 * 1024 * 1024 : 10 * 1024 * 1024 + 16;
    const end = Math.min(offset + chunkSize, currentFile.size);

    const chunkBlob = currentFile.slice(offset, end);
    const buffer = await chunkBlob.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    bytesProcessed.current += bytes.length;

    workerRef.current.postMessage({ 
      type: isEncryptingRef.current ? 'encrypt_chunk' : 'decrypt_chunk', 
      chunk: bytes 
    } as WorkerMessage);
  };

  const updateProgress = () => {
    const elapsed = (performance.now() - startTime.current) / 1000;
    const progressRatio = Math.min(bytesProcessed.current / totalBytes.current, 1);
    setProgress(progressRatio * 100);

    if (progressRatio > 0 && progressRatio < 1) {
      const totalEstimatedTime = elapsed / progressRatio;
      const remainingTime = totalEstimatedTime - elapsed;
      setEta(`ETA: ${Math.max(0, Math.ceil(remainingTime))}s`);
    } else if (progressRatio >= 1) {
      setEta("Finalizing...");
    }
  };

  const finishProcessing = () => {
    const finalBlob = new Blob(outputChunks.current, { type: 'application/octet-stream' });
    const url = URL.createObjectURL(finalBlob);
    setDownloadUrl(url);
    
    const currentFile = fileRef.current;
    if (currentFile) {
      if (isEncryptingRef.current) {
        setFinalFileName(`${currentFile.name}.hat`);
      } else {
        setFinalFileName(currentFile.name.replace(/\.hat$/, ''));
      }
    }
    
    // Clear chunks from memory immediately
    outputChunks.current = [];
    
    setStep(4);
  };

  const resetAll = () => {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setFile(null);
    fileRef.current = null;
    setPassword("");
    setShowPassword(false);
    setStep(1);
    setErrorMsg("");
    setDownloadUrl(null);
    workerRef.current?.postMessage({ type: 'reset' } as WorkerMessage);
  };

  // --- Step 1 Handlers ---
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
      setStep(2);
    }
  }, []);

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
      setFile(e.target.files[0]);
      setStep(2);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      document.getElementById('fileInput')?.click();
    }
  };

  // --- Background Color ---
  let bgClass = "bg-[var(--color-mocha-base)]";
  if (step === 4) {
    if (errorMsg) bgClass = "bg-[var(--color-mocha-red)]";
    else bgClass = "bg-[var(--color-mocha-green)]";
  }

  return (
    <main 
      role="main"
      aria-live="polite"
      className={`relative w-full h-screen transition-colors duration-500 ease-in-out ${bgClass} flex flex-col items-center justify-center`}
    >
      
      {/* Content Area */}
      <div className="flex-1 w-full max-w-2xl mx-auto flex flex-col items-center justify-center p-8 text-center z-10">
        
        {step === 1 && (
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
            <div className={`w-full max-w-xl aspect-video rounded-3xl border-4 border-dashed transition-all duration-300 flex flex-col items-center justify-center bg-[var(--color-mocha-surface0)]/30 ${isDragging ? 'border-[var(--color-mocha-blue)] scale-105 bg-[var(--color-mocha-blue)]/10' : 'border-[var(--color-mocha-surface1)] group-hover:border-[var(--color-mocha-blue)] group-hover:bg-[var(--color-mocha-surface0)]/50'}`}>
              <div className="w-16 h-16 rounded-full bg-[var(--color-mocha-blue)] text-[var(--color-mocha-base)] flex items-center justify-center text-4xl mb-6 shadow-lg shadow-[var(--color-mocha-blue)]/20 transition-transform group-hover:scale-110">
                +
              </div>
              <h1 className="text-3xl font-medium text-[var(--color-mocha-text)] tracking-tight">
                Drag & Drop a file
              </h1>
              <p className="mt-2 text-neutral-400 font-light">or click to browse</p>
            </div>
          </label>
        )}

        {step === 2 && (
          <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="inline-block px-6 py-3 rounded-full bg-[var(--color-mocha-surface0)] border border-[var(--color-mocha-surface1)] mb-10 shadow-sm max-w-full truncate">
              <span className="text-[var(--color-mocha-text)] font-medium truncate" aria-label={`Selected file: ${file?.name}`}>{file?.name}</span>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); if (password.length >= 8) startProcessing(); }} className="flex flex-col gap-6">
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"}
                  autoFocus
                  aria-label="Password (min 8 chars)"
                  placeholder="Password (min 8 chars)"
                  className="w-full bg-transparent border-b-2 border-[var(--color-mocha-surface1)] text-center text-3xl font-light py-4 focus:outline-none focus:border-[var(--color-mocha-blue)] transition-colors placeholder:text-neutral-500 text-[var(--color-mocha-text)] pr-12"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  maxLength={2048}
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Reveal password"}
                  className="absolute right-0 top-1/2 -translate-y-1/2 p-2 text-neutral-500 hover:text-[var(--color-mocha-text)] transition-colors focus:outline-none"
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
              <button 
                type="submit" 
                aria-disabled={password.length < 8}
                disabled={password.length < 8}
                className="mt-6 bg-[var(--color-mocha-surface0)] border border-[var(--color-mocha-surface1)] text-[var(--color-mocha-text)] rounded-full py-4 px-8 text-sm font-medium tracking-wide uppercase disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--color-mocha-surface1)] transition-colors"
              >
                {file?.name.endsWith('.hat') ? 'Decrypt File' : 'Encrypt File'}
              </button>
            </form>
          </div>
        )}

        {step === 3 && (
          <div className="w-full max-w-md animate-in fade-in duration-500" aria-live="assertive">
            <h2 className="text-xl font-light mb-12 text-[var(--color-mocha-text)]">{isEncrypting ? 'Encrypting...' : 'Decrypting...'}</h2>
            
            <div 
              role="progressbar" 
              aria-valuenow={Math.round(progress)} 
              aria-valuemin={0} 
              aria-valuemax={100}
              aria-label={isEncrypting ? "Encryption progress" : "Decryption progress"}
              className="w-full h-2 bg-[var(--color-mocha-surface0)] rounded-full overflow-hidden relative shadow-inner"
            >
              <div 
                className="absolute top-0 left-0 h-full bg-[var(--color-mocha-blue)] transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            
            <p className="mt-6 text-sm text-[var(--color-mocha-text)] font-light tracking-wide">{eta}</p>
          </div>
        )}

        {step === 4 && (
          <div className="w-full max-w-md animate-in zoom-in-95 duration-500" aria-live="assertive">
            {errorMsg ? (
              <>
                <h1 className="text-4xl font-bold text-[var(--color-mocha-base)] mb-6 tracking-tight">Access Denied</h1>
                <p className="text-[var(--color-mocha-base)]/80 font-medium mb-12">{errorMsg}</p>
              </>
            ) : (
              <>
                <h1 className="text-4xl font-bold text-[var(--color-mocha-base)] mb-6 tracking-tight">Success</h1>
                <p className="text-[var(--color-mocha-base)]/80 font-medium mb-12 text-xl truncate">{finalFileName}</p>
                <a 
                  href={downloadUrl!} 
                  download={finalFileName}
                  aria-label={`Download ${finalFileName}`}
                  className="inline-block bg-[var(--color-mocha-base)] text-[var(--color-mocha-text)] rounded-full py-4 px-12 text-sm font-semibold tracking-wide uppercase hover:bg-[var(--color-mocha-surface0)] transition-all shadow-lg hover:shadow-xl hover:-translate-y-1"
                >
                  Download
                </a>
              </>
            )}
            
            <div className="mt-16">
              <button 
                onClick={resetAll}
                aria-label="Process another file"
                className="text-sm font-semibold tracking-wider uppercase text-[var(--color-mocha-base)]/70 hover:text-[var(--color-mocha-base)] transition-colors underline decoration-transparent hover:decoration-[var(--color-mocha-base)] underline-offset-4"
              >
                Process another file
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Persistent Bottom Step-Progress Bar */}
      <div className="absolute bottom-12 left-0 w-full flex justify-center items-center z-50" aria-hidden="true">
        <div className="flex items-center gap-4">
          {[1, 2, 3, 4].map((s, index) => (
            <div key={s} className="flex items-center">
              <div className={`w-3 h-3 rounded-full transition-all duration-500 ${step >= s ? 'bg-[var(--color-mocha-blue)] shadow-[0_0_10px_var(--color-mocha-blue)]' : 'border border-[var(--color-mocha-surface1)] bg-transparent'}`} />
              {index < 3 && (
                <div className="w-12 h-[2px] mx-2 relative overflow-hidden bg-[var(--color-mocha-surface0)]">
                  <div 
                    className="absolute top-0 left-0 h-full bg-[var(--color-mocha-blue)] transition-all duration-500"
                    style={{ width: step > s ? '100%' : '0%' }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
