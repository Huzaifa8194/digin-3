import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { ArrowDown } from 'lucide-react';

// Share one page scroll surface across artwork, text, and interactive controls.
export function useSectionScroll(ref: RefObject<HTMLElement | null>, pinned = false) {
  const [position, setPosition] = useState({ percent: 0, screens: 0 });
  useEffect(() => {
    const section = ref.current;
    if (!section) return;
    let frame = 0;
    const update = () => {
      const rect = section.getBoundingClientRect();
      const distance = Math.max(1, rect.height - (pinned ? window.innerHeight : 80));
      const travelled = Math.min(distance, Math.max(0, (pinned ? 0 : 80) - rect.top));
      setPosition({ percent: Math.round(travelled / distance * 100), screens: (distance - travelled) / window.innerHeight });
    };
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(update); };
    const wheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey || !event.deltaY || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1;
      event.preventDefault();
      window.scrollBy({ top: event.deltaY * unit * 1.4, behavior: 'instant' });
    };
    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    section.addEventListener('wheel', wheel, { passive: false, capture: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      section.removeEventListener('wheel', wheel, true);
    };
  }, [ref, pinned]);
  return position;
}

export function ScrollFeedback({ sectionRef, next, pinned = false }: { sectionRef: RefObject<HTMLElement | null>; next: string; pinned?: boolean }) {
  const { percent, screens } = useSectionScroll(sectionRef, pinned);
  const lastPercent = useRef(percent);
  const moving = lastPercent.current !== percent;
  useEffect(() => { lastPercent.current = percent; }, [percent]);
  return <div className={`scroll-feedback ${moving ? 'is-scrolling' : ''}`}>
    <div className="scroll-feedback-heading"><span><ArrowDown size={13}/> Scroll to continue</span><span>{percent}%</span></div>
    <div className="scroll-feedback-track" role="progressbar" aria-label="Scroll progress through this section" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}><div style={{ width: `${percent}%` }}/></div>
    <div className="scroll-feedback-meta"><span>{screens < .05 ? 'Next section is ready' : `${screens.toFixed(1)} screens to next section`}</span><a href={`#${next}`}>Continue <ArrowDown size={11}/></a></div>
  </div>;
}
