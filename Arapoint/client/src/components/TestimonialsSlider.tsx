import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight, Star, Quote } from "lucide-react";

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  company?: string;
  avatar_url?: string | null;
  quote: string;
  rating?: number;
}

const DEFAULTS: Testimonial[] = [
  { id: "1", name: "Amaka Obi", role: "Head of Talent", company: "TechBridge Lagos", quote: "We onboard over 50 professionals every quarter. Before Arapoint, verification took 2 weeks. Now we get a cross-referenced PASS/FAIL in minutes — it has completely changed how we hire.", rating: 5 },
  { id: "2", name: "Chukwuemeka Adeyemi", role: "Chief Executive Officer", company: "QuickLend Finance", quote: "Our loan default rate dropped 40% in the first quarter after integrating Arapoint. The BVN + NIN cross-reference catches fraud patterns we would have missed entirely. Best API investment we have made.", rating: 5 },
  { id: "3", name: "Chioma Eze", role: "Compliance & KYC Lead", company: "PayFast Africa", quote: "NDPA compliance is non-negotiable for us. Arapoint was the only provider that gave us direct-registry data with proper audit trails. The sandbox made our integration completely painless.", rating: 5 },
  { id: "4", name: "Ibrahim Musa", role: "Chief Technology Officer", company: "HireRight Nigeria", quote: "We have processed over 3,000 employment screenings through Arapoint. The automated scoring is incredibly accurate — it flags exactly what needs manual review and clears everything else automatically.", rating: 5 },
  { id: "5", name: "Ngozi Nwosu", role: "Operations Director", company: "LendSmart", quote: "From API signup to first live verification in under 30 minutes. The developer portal is clean, the docs are excellent, and support was fast. Rare for a Nigerian tech product.", rating: 5 },
];

function initials(name: string) {
  return name.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase();
}

interface Props {
  dark?: boolean;
  accentColor?: string;
}

export function TestimonialsSlider({ dark = false, accentColor }: Props) {
  const [items, setItems] = useState<Testimonial[]>(DEFAULTS);
  const [current, setCurrent] = useState(0);
  const [sliding, setSliding] = useState(false);
  const [slideDir, setSlideDir] = useState<"left" | "right">("left");
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch("/api/testimonials")
      .then(r => r.json())
      .then(d => { if (d.status === "success" && Array.isArray(d.data) && d.data.length >= 1) setItems(d.data); })
      .catch(() => {});
  }, []);

  const goTo = useCallback((idx: number, dir: "left" | "right") => {
    if (sliding || items.length <= 1) return;
    setSlideDir(dir);
    setSliding(true);
    setTimeout(() => {
      setCurrent(idx);
      setSliding(false);
    }, 380);
  }, [sliding, items.length]);

  const next = useCallback(() => goTo((current + 1) % items.length, "left"), [goTo, current, items.length]);
  const prev = useCallback(() => goTo((current - 1 + items.length) % items.length, "right"), [goTo, current, items.length]);

  useEffect(() => {
    if (paused || items.length <= 1) return;
    timerRef.current = setInterval(next, 5000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [next, paused, items.length]);

  const accent = accentColor || (dark ? "#10b981" : "#16a34a");
  const cardBg = dark ? "#1f2937" : "#ffffff";
  const cardBorder = dark ? "#374151" : "#e5e7eb";
  const textColor = dark ? "#f3f4f6" : "#111827";
  const mutedColor = dark ? "#9ca3af" : "#6b7280";
  const sectionBg = dark ? "transparent" : "transparent";

  const t = items[current];

  const slideOutClass = sliding
    ? slideDir === "left"
      ? "opacity-0 -translate-x-8"
      : "opacity-0 translate-x-8"
    : "opacity-100 translate-x-0";

  return (
    <section
      style={{ background: sectionBg }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="container mx-auto px-4 py-16 sm:py-20">
        <div className="text-center mb-10">
          <div
            className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full mb-4"
            style={{ background: `${accent}18`, color: accent, border: `1px solid ${accent}30` }}
          >
            <Star className="w-3.5 h-3.5 fill-current" /> Trusted by Nigerian businesses
          </div>
          <h2
            className="text-2xl sm:text-3xl font-bold"
            style={{ color: textColor }}
          >
            What our customers say
          </h2>
        </div>

        <div className="max-w-2xl mx-auto relative">
          {/* Card */}
          <div
            className={`transition-all duration-300 ease-in-out ${slideOutClass}`}
            style={{
              background: cardBg,
              border: `1px solid ${cardBorder}`,
              borderRadius: 20,
              padding: "2rem",
              boxShadow: dark
                ? "0 25px 50px rgba(0,0,0,0.4)"
                : "0 8px 40px rgba(0,0,0,0.08)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Accent top bar */}
            <div
              style={{
                position: "absolute",
                top: 0, left: 0, right: 0,
                height: 3,
                background: `linear-gradient(90deg, ${accent}, ${accent}66)`,
                borderRadius: "20px 20px 0 0",
              }}
            />

            {/* Quote icon */}
            <div className="mb-5" style={{ color: `${accent}40` }}>
              <Quote className="w-10 h-10 fill-current" />
            </div>

            {/* Stars */}
            <div className="flex gap-1 mb-4">
              {Array.from({ length: t.rating ?? 5 }).map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-current" style={{ color: "#f59e0b" }} />
              ))}
            </div>

            {/* Quote text */}
            <p
              className="text-base sm:text-lg leading-relaxed mb-6 italic"
              style={{ color: textColor }}
            >
              "{t.quote}"
            </p>

            {/* Divider */}
            <div style={{ height: 1, background: cardBorder, marginBottom: "1.25rem" }} />

            {/* Author */}
            <div className="flex items-center gap-3">
              {t.avatar_url ? (
                <img
                  src={t.avatar_url}
                  alt={t.name}
                  className="w-11 h-11 rounded-full object-cover flex-shrink-0"
                  style={{ border: `2px solid ${accent}33` }}
                />
              ) : (
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold text-white"
                  style={{ background: `linear-gradient(135deg, ${accent}, ${accent}99)` }}
                >
                  {initials(t.name)}
                </div>
              )}
              <div>
                <p className="font-semibold text-sm" style={{ color: textColor }}>{t.name}</p>
                <p className="text-xs" style={{ color: mutedColor }}>
                  {t.role}{t.company ? ` · ${t.company}` : ""}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation arrows */}
          {items.length > 1 && (
            <>
              <button
                onClick={prev}
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-5 w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                style={{
                  background: cardBg,
                  border: `1px solid ${cardBorder}`,
                  color: mutedColor,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
                }}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={next}
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-5 w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                style={{
                  background: cardBg,
                  border: `1px solid ${cardBorder}`,
                  color: mutedColor,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
                }}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}

          {/* Dots */}
          {items.length > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              {items.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i, i > current ? "left" : "right")}
                  className="rounded-full transition-all duration-300"
                  style={{
                    width: i === current ? 24 : 8,
                    height: 8,
                    background: i === current ? accent : `${accent}33`,
                    border: "none",
                    cursor: "pointer",
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
