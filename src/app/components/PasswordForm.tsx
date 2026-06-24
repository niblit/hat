import { useState } from "react";
import FilePill from "./FilePill";

interface Props {
  filename?: string;
  isEncrypting: boolean;
  onSubmit: (password: string) => void;
}

export default function PasswordForm({ filename, isEncrypting, onSubmit }: Props) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
      <FilePill filename={filename} />
      <form onSubmit={(e) => { e.preventDefault(); if (password.length >= 8) onSubmit(password); }} className="flex flex-col gap-6">
        <div className="relative">
          <input 
            type={showPassword ? "text" : "password"}
            autoFocus
            aria-label="Password (min 8 chars)"
            placeholder="Password (min 8 chars)"
            className="w-full bg-transparent border-b-2 border-mocha-surface1 text-center text-3xl font-light py-4 focus:outline-none focus:border-mocha-blue transition-colors placeholder:text-neutral-500 text-mocha-text pr-12"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            maxLength={2048}
          />
          <button 
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? "Hide password" : "Reveal password"}
            className="absolute right-0 top-1/2 -translate-y-1/2 p-2 text-neutral-500 hover:text-mocha-text transition-colors focus:outline-none"
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
          className="mt-6 bg-mocha-surface0 border border-mocha-surface1 text-mocha-text rounded-full py-4 px-8 text-sm font-medium tracking-wide uppercase disabled:opacity-50 disabled:cursor-not-allowed hover:bg-mocha-surface1 transition-colors"
        >
          {isEncrypting ? 'Encrypt File' : 'Decrypt File'}
        </button>
      </form>
    </div>
  );
}
