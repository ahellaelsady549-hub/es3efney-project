import { Suspense, useCallback, useEffect, useRef, useState, type LazyExoticComponent, type ComponentType } from 'react';

type DeferredHomeSectionProps = {
  id: string;
  section: LazyExoticComponent<ComponentType>;
  minHeight: number;
};

const SectionPlaceholder = ({ minHeight }: { minHeight: number }) => (
  <div aria-hidden="true" className="container mx-auto space-y-5 px-4 py-16" style={{ minHeight }}>
    <div className="mx-auto h-8 w-2/5 animate-pulse rounded-md bg-muted" />
    <div className="h-24 animate-pulse rounded-2xl bg-muted/60" />
    <div className="h-40 animate-pulse rounded-2xl bg-muted/40" />
  </div>
);

const RenderComplete = ({ onReady }: { onReady: () => void }) => {
  useEffect(() => onReady(), [onReady]);
  return null;
};

/** Loads below-the-fold home sections shortly before they enter view. */
export function DeferredHomeSection({ id, section: Section, minHeight }: DeferredHomeSectionProps) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);
  const [sectionRendered, setSectionRendered] = useState(false);
  const markSectionRendered = useCallback(() => setSectionRendered(true), []);

  useEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    if (!("IntersectionObserver" in window)) {
      setShouldLoad(true);
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      setShouldLoad(true);
      observer.disconnect();
    }, { rootMargin: '500px 0px' });

    observer.observe(anchor);
    return () => observer.disconnect();
  }, []);

  return (
    <div id={sectionRendered ? undefined : id} ref={anchorRef} className="scroll-mt-24">
      {shouldLoad ? (
        <Suspense fallback={<SectionPlaceholder minHeight={minHeight} />}>
          <>
            <Section />
            <RenderComplete onReady={markSectionRendered} />
          </>
        </Suspense>
      ) : (
        <SectionPlaceholder minHeight={minHeight} />
      )}
    </div>
  );
}
