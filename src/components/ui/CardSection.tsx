import type { PropsWithChildren, ReactNode } from "react";

interface CardSectionProps extends PropsWithChildren {
  title?: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function CardSection({
  title,
  description,
  action,
  className = "",
  children,
}: CardSectionProps) {
  return (
    <section
      className={`rounded-3xl border border-white/60 bg-white/80 p-6 shadow-panel backdrop-blur ${className}`}
    >
      {(title || description || action) && (
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            {title ? <h2 className="font-serif text-2xl text-ink">{title}</h2> : null}
            {description ? (
              <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
            ) : null}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
