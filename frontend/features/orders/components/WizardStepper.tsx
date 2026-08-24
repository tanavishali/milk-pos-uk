import { WizardStep } from "@enums/index";
import { cn } from "@utils/libs/cn";

const STEPS = [WizardStep.Customer, WizardStep.Items, WizardStep.Dispatch];

/** Three dots: current is accent and slightly larger, completed are green. */
export function WizardStepper({ current }: { current: WizardStep }) {
  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      {STEPS.map((step, index) => (
        <div key={step} className="flex items-center gap-1.5 sm:gap-2">
          {index > 0 ? <div className="bg-border h-0.5 w-3 sm:w-4" /> : null}
          <span
            aria-current={step === current ? "step" : undefined}
            className={cn(
              "text-micro flex h-5 w-5 items-center justify-center rounded-full font-extrabold transition-all sm:h-6 sm:w-6",
              step === current &&
                "bg-accent text-foreground-on-accent scale-110 shadow-card",
              step < current && "bg-success text-foreground-on-accent",
              step > current && "bg-surface-inset text-foreground-body",
            )}
          >
            {step}
          </span>
        </div>
      ))}
    </div>
  );
}
