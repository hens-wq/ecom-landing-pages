import { Select } from "@/components/ui/select";
import { MAIN_STATUSES, SECONDARY_STATUSES_BY_MAIN, type MainStatus } from "@/lib/lead-status/types";

interface StatusSelectProps {
  mainStatus: MainStatus;
  secondaryStatus: string;
  disabled?: boolean;
  onMainStatusChange: (mainStatus: MainStatus) => void;
  onSecondaryStatusChange: (secondaryStatus: string) => void;
}

/** Main + Secondary status dropdown pair - the Secondary options always come from SECONDARY_STATUSES_BY_MAIN[mainStatus] only, so an invalid combination can never be displayed even mid-edit. */
export function StatusSelect({
  mainStatus,
  secondaryStatus,
  disabled,
  onMainStatusChange,
  onSecondaryStatusChange,
}: StatusSelectProps) {
  const secondaryOptions = SECONDARY_STATUSES_BY_MAIN[mainStatus];

  return (
    <div className="flex flex-col gap-1">
      <Select
        value={mainStatus}
        disabled={disabled}
        onChange={(e) => onMainStatusChange(e.target.value as MainStatus)}
        aria-label="סטטוס ראשי"
      >
        {MAIN_STATUSES.map((status) => (
          <option key={status} value={status}>
            {status}
          </option>
        ))}
      </Select>
      <Select
        value={secondaryStatus}
        disabled={disabled}
        onChange={(e) => onSecondaryStatusChange(e.target.value)}
        aria-label="סטטוס משני"
      >
        {secondaryOptions.map((status) => (
          <option key={status} value={status}>
            {status}
          </option>
        ))}
      </Select>
    </div>
  );
}
