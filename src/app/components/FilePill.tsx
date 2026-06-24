export default function FilePill({ filename }: { filename?: string }) {
  if (!filename) return null;
  return (
    <div className="inline-block px-6 py-3 rounded-full bg-mocha-surface0 border border-mocha-surface1 mb-10 shadow-sm max-w-full truncate">
      <span className="text-mocha-text font-medium truncate" aria-label={`Selected file: ${filename}`}>
        {filename}
      </span>
    </div>
  );
}
