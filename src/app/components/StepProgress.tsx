import type { Step } from "../hooks/useCryptoWorker";

interface Props {
  currentStep: Step;
}

export default function StepProgress({ currentStep }: Props) {
  return (
    <div className="w-full flex justify-center items-center pb-8 pt-4 z-50 shrink-0" aria-hidden="true">
      <div className="flex items-center gap-4">
        {[1, 2, 3, 4].map((s, index) => (
          <div key={s} className="flex items-center">
            <div className={`w-3 h-3 rounded-full transition-all duration-500 ${currentStep >= s ? 'bg-mocha-blue shadow-[0_0_10px_var(--color-mocha-blue)]' : 'border border-mocha-surface1 bg-transparent'}`} />
            {index < 3 && (
              <div className="w-12 h-[2px] mx-2 relative overflow-hidden bg-mocha-surface0">
                <div 
                  className="absolute top-0 left-0 h-full bg-mocha-blue transition-all duration-500"
                  style={{ width: currentStep > s ? '100%' : '0%' }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
