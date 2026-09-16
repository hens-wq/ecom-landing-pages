import { Select } from "@/components/ui/select";
import { MAIN_STATUSES, SECONDARY_STATUSES_BY_MAIN, type MainStatus } from "@/lib/lead-status/types";

interface MainStatusSelectProps {
  mainStatus: MainStatus;
  disabled?: boolean;
  onChange: (mainStatus: MainStatus) => void;
}

export function MainStatusSelect({ mainStatus, disabled, onChange }: MainStatusSelectProps) {
  return (
    <Select value={mainStatus} disabled={disabled} onChange={(e) => onChange(e.target.value as MainStatus)} aria-label="סטטוס ראשי">
      {MAIN_STATUSES.map((status) => (
        <option key={status} value={status}>
          {status}
        </option>
      ))}
    </Select>
  );
}

interface SecondaryStatusSelectProps {
  mainStatus: MainStatus;
  secondaryStatus: string;
  disabled?: boolean;
  onChange: (secondaryStatus: string) => void;
}

/** Options always come from SECONDARY_STATUSES_BY_MAIN[mainStatus] only, so an invalid combination can never be displayed even mid-edit. */
export function SecondaryStatusSelect({ mainStatus, secondaryStatus, disabled, onChange }: SecondaryStatusSelectProps) {
  const options = SECONDARY_STATUSES_BY_MAIN[mainStatus];
  return (
    <Select value={secondaryStatus} disabled={disabled} onChange={(e) => onChange(e.target.value)} aria-label="סטטוס משני">
      {options.map((status) => (
        <option key={status} value={status}>
          {status}
        </option>
      ))}
    </Select>
  );
}
