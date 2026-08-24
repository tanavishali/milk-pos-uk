import { Card } from "@components/ui/cards";
import { Badge } from "@components/ui/data-display";
import { CURRENT_USER } from "@constants/index";
import { initials } from "@utils/helper/format";

export function ProfileView() {
  return (
    <Card className="max-w-lg space-y-4 p-4">
      <div className="flex items-center gap-3">
        <span className="bg-chrome-accent text-chrome rounded-card flex h-12 w-12 items-center justify-center text-base font-black sm:h-14 sm:w-14 sm:text-lg">
          {initials(CURRENT_USER.name)}
        </span>
        <div>
          <h3 className="text-foreground-strong text-sm font-extrabold">
            {CURRENT_USER.name}
          </h3>
          <p className="text-label text-foreground-subtle">
            {CURRENT_USER.title}
          </p>
          <Badge pill tone="accent" className="mt-0.5">
            {CURRENT_USER.badge}
          </Badge>
        </div>
      </div>

      <dl className="border-border-subtle grid grid-cols-1 gap-2.5 border-t pt-3 text-xs sm:grid-cols-2">
        <div>
          <dt className="text-foreground-subtle text-micro font-medium">
            Terminal Email
          </dt>
          <dd className="text-foreground font-bold">{CURRENT_USER.email}</dd>
        </div>
        <div>
          <dt className="text-foreground-subtle text-micro font-medium">
            Terminal ID
          </dt>
          <dd className="text-foreground font-bold">
            {CURRENT_USER.terminalId}
          </dd>
        </div>
      </dl>
    </Card>
  );
}
