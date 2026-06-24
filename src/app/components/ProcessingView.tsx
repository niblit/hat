interface Props {
  isEncrypting: boolean;
  progress: number;
  eta: string;
}

export default function ProcessingView({ isEncrypting, progress, eta }: Props) {
  return (
    <div className="w-full max-w-md animate-in fade-in duration-500" aria-live="assertive">
      <h2 className="text-xl font-light mb-12 text-mocha-text">
        {isEncrypting ? 'Encrypting...' : 'Decrypting...'}
      </h2>
      
      <div 
        role="progressbar" 
        aria-valuenow={Math.round(progress)} 
        aria-valuemin={0} 
        aria-valuemax={100}
        aria-label={isEncrypting ? "Encryption progress" : "Decryption progress"}
        className="w-full h-2 bg-mocha-surface0 rounded-full overflow-hidden relative shadow-inner"
      >
        <div 
          className="absolute top-0 left-0 h-full bg-mocha-blue transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      
      <p className="mt-6 text-sm text-mocha-text font-light tracking-wide">{eta}</p>
    </div>
  );
}
