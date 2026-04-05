import { useEffect, useRef, useState } from "react";

interface UseVideoPlayerOptions {
  durations: Record<string, number>;
}

export function useVideoPlayer({ durations }: UseVideoPlayerOptions) {
  const keys = Object.keys(durations);
  const [currentScene, setCurrentScene] = useState(0);
  const hasStoppedRef = useRef(false);
  const totalDuration = Object.values(durations).reduce((a, b) => a + b, 0);

  useEffect(() => {
    (window as any).startRecording?.();

    let elapsed = 0;
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    keys.forEach((_, index) => {
      if (index === 0) return;
      elapsed += durations[keys[index - 1]];
      const t = setTimeout(() => {
        setCurrentScene(index);
      }, elapsed);
      timeouts.push(t);
    });

    const stopAt = setTimeout(() => {
      if (!hasStoppedRef.current) {
        hasStoppedRef.current = true;
        (window as any).stopRecording?.();
      }
    }, totalDuration);
    timeouts.push(stopAt);

    const loopAt = setTimeout(() => {
      setCurrentScene(0);
      hasStoppedRef.current = false;
    }, totalDuration + 100);
    timeouts.push(loopAt);

    return () => timeouts.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (currentScene === 0 && hasStoppedRef.current === false) return;
    if (currentScene !== 0) return;

    let elapsed = 0;
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    keys.forEach((_, index) => {
      if (index === 0) return;
      elapsed += durations[keys[index - 1]];
      const t = setTimeout(() => {
        setCurrentScene(index);
      }, elapsed);
      timeouts.push(t);
    });

    const loopAt = setTimeout(() => {
      setCurrentScene(0);
    }, totalDuration + 100);
    timeouts.push(loopAt);

    return () => timeouts.forEach(clearTimeout);
  }, [currentScene]);

  return { currentScene };
}
