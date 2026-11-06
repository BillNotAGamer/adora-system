import type { ReactNode } from "react";

type PageIntroProps = {
  eyebrow: string;
  /** The page's single h1. Pass an emphasised fragment with `<em>` for the editorial accent. */
  title: ReactNode;
  children: ReactNode;
  aside?: ReactNode;
};

/** Oversized editorial introduction used at the top of the Discovery list pages. */
export function PageIntro({ eyebrow, title, children, aside }: Readonly<PageIntroProps>) {
  return (
    <section className="adora-container pt-14 pb-16 sm:pt-20 sm:pb-20 lg:pt-28 lg:pb-24">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,.65fr)] lg:items-end lg:gap-[clamp(3rem,7vw,8rem)]">
        <div>
          <p className="adora-eyebrow text-[var(--adora-sage)]">{eyebrow}</p>
          <h1 className="font-editorial mt-7 max-w-[14ch] text-[clamp(3rem,8vw,7.25rem)] leading-[0.92] font-medium tracking-[-0.05em] text-balance">
            {title}
          </h1>
        </div>
        <div className="max-w-md text-sm leading-7 text-[var(--adora-text-secondary)] sm:text-base sm:leading-8">
          {children}
          {aside ? <div className="mt-6">{aside}</div> : null}
        </div>
      </div>
    </section>
  );
}
