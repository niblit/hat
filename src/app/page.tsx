"use client";

import { useCryptoWorker } from "./hooks/useCryptoWorker";
import FileUpload from "./components/FileUpload";
import PasswordForm from "./components/PasswordForm";
import ProcessingView from "./components/ProcessingView";
import ResultView from "./components/ResultView";
import StepProgress from "./components/StepProgress";

export default function Home() {
  const {
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
  } = useCryptoWorker();

  let bgClass = "bg-[var(--color-mocha-base)]";
  if (step === 4) {
    if (errorMsg) bgClass = "bg-[var(--color-mocha-red)]";
    else bgClass = "bg-[var(--color-mocha-green)]";
  }

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    setStep(2);
  };

  return (
    <main 
      role="main"
      aria-live="polite"
      className={`relative w-full h-[100dvh] flex flex-col transition-colors duration-500 ease-in-out ${bgClass}`}
    >
      <div className="flex-1 w-full max-w-2xl mx-auto flex flex-col items-center justify-center p-8 text-center z-10 relative">
        {step === 1 && (
          <FileUpload onFileSelect={handleFileSelect} />
        )}

        {step === 2 && (
          <PasswordForm 
            filename={file?.name} 
            isEncrypting={!file?.name.endsWith('.hat')} 
            onSubmit={startProcessing} 
          />
        )}

        {step === 3 && (
          <ProcessingView 
            isEncrypting={isEncrypting} 
            progress={progress} 
            eta={eta} 
          />
        )}

        {step === 4 && (
          <ResultView 
            errorMsg={errorMsg}
            finalFileName={finalFileName}
            downloadUrl={downloadUrl}
            onReset={resetAll}
          />
        )}
      </div>

      <StepProgress currentStep={step} />
    </main>
  );
}
