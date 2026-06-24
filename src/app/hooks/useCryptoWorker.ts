import { useState, useRef, useEffect, useCallback } from "react";
import type { WorkerMessage, WorkerResponse } from "../../worker/crypto.worker";

export type Step = 1 | 2 | 3 | 4;

export function useCryptoWorker() {
  const [step, setStep] = useState<Step>(1);
  const [file, setFile] = useState<File | null>(null);
  const [isEncrypting, setIsEncrypting] = useState(true);
  
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
    workerRef.current = new Worker(new URL('../../worker/crypto.worker.ts', import.meta.url), { type: 'module' });
    
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleError = (msg: string) => {
    setErrorMsg(msg);
    setStep(4);
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

  const startProcessing = async (password: string) => {
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
      const headerBlob = file.slice(0, 105);
      const headerBuffer = await headerBlob.arrayBuffer();
      const headerBytes = new Uint8Array(headerBuffer);
      
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

  const resetAll = useCallback(() => {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setFile(null);
    fileRef.current = null;
    setStep(1);
    setErrorMsg("");
    setDownloadUrl(null);
    workerRef.current?.postMessage({ type: 'reset' } as WorkerMessage);
  }, [downloadUrl]);

  return {
    step,
    setStep,
    file,
    setFile,
    isEncrypting,
    progress,
    eta,
    errorMsg,
    downloadUrl,
    finalFileName,
    startProcessing,
    resetAll
  };
}
