interface Props {
  errorMsg: string;
  finalFileName: string;
  downloadUrl: string | null;
  onReset: () => void;
}

export default function ResultView({ errorMsg, finalFileName, downloadUrl, onReset }: Props) {
  return (
    <div className="w-full max-w-md animate-in zoom-in-95 duration-500" aria-live="assertive">
      {errorMsg ? (
        <>
          <h1 className="text-4xl font-bold text-mocha-base mb-6 tracking-tight">Access Denied</h1>
          <p className="text-mocha-base/80 font-medium mb-12">{errorMsg}</p>
        </>
      ) : (
        <>
          <h1 className="text-4xl font-bold text-mocha-base mb-6 tracking-tight">Success</h1>
          <p className="text-mocha-base/80 font-medium mb-12 text-xl truncate">{finalFileName}</p>
          {downloadUrl && (
            <a 
              href={downloadUrl} 
              download={finalFileName}
              aria-label={`Download ${finalFileName}`}
              className="inline-block bg-mocha-base text-mocha-text rounded-full py-4 px-12 text-sm font-semibold tracking-wide uppercase hover:bg-mocha-surface0 transition-all shadow-lg hover:shadow-xl hover:-translate-y-1"
            >
              Download
            </a>
          )}
        </>
      )}
      
      <div className="mt-16">
        <button 
          onClick={onReset}
          aria-label="Process another file"
          className="text-sm font-semibold tracking-wider uppercase text-mocha-base/70 hover:text-mocha-base transition-colors underline decoration-transparent hover:decoration-mocha-base underline-offset-4"
        >
          Process another file
        </button>
      </div>
    </div>
  );
}
