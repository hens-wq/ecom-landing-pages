import { Fragment } from "react";

/** Renders text with any "Ecom" substring picked out in brand purple. */
export function HighlightEcom({ text }: { text: string }) {
  const parts = text.split(/(Ecom)/g);
  return (
    <>
      {parts.map((part, i) => (
        <Fragment key={i}>
          {part === "Ecom" ? <span className="text-[var(--brand-purple)]">{part}</span> : part}
        </Fragment>
      ))}
    </>
  );
}
