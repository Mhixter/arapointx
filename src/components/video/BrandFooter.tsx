import { motion } from 'framer-motion';

interface BrandFooterProps {
  /**
   * Visual variant for the closing scene.
   * - 'full' renders the full lockup (logo + URL + email) centered, ideal for outro scenes.
   * - 'compact' renders a slim bottom strip (URL + email), ideal for in-scene corners.
   */
  variant?: 'full' | 'compact';
  /** Stagger delay (in seconds) before the lockup animates in. */
  delay?: number;
}

const URL_DOMAIN = 'arapoint.com.ng';
const SUPPORT_EMAIL = 'support@arapoint.com.ng';

export function BrandFooter({ variant = 'full', delay = 0 }: BrandFooterProps) {
  if (variant === 'compact') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 12 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay }}
        className="absolute bottom-[3vh] left-1/2 -translate-x-1/2 flex items-center gap-[2vw] text-[1.1vw] text-white/70"
        style={{ fontFamily: "'Inter', sans-serif", letterSpacing: '0.04em' }}
      >
        <span className="font-medium">{URL_DOMAIN}</span>
        <span className="w-[1px] h-[1.2vw] bg-white/30" />
        <span>{SUPPORT_EMAIL}</span>
      </motion.div>
    );
  }

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
      <motion.img
        src={`${import.meta.env.BASE_URL}logos/arapoint-logo.png`}
        alt="Arapoint"
        initial={{ opacity: 0, scale: 0.92, y: 18 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay }}
        className="w-[28vw] max-w-[420px] h-auto select-none"
        draggable={false}
      />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: delay + 0.25 }}
        className="mt-[3vh] text-[2vw] font-semibold tracking-[0.04em] text-white"
        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      >
        {URL_DOMAIN}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: delay + 0.4 }}
        className="mt-[1.2vh] flex items-center gap-[1vw] text-[1.15vw] text-white/75"
        style={{ fontFamily: "'Inter', sans-serif", letterSpacing: '0.06em' }}
      >
        <span className="w-[2vw] h-[1px] bg-[var(--ap-green,#6DB33F)]" />
        <span>{SUPPORT_EMAIL}</span>
        <span className="w-[2vw] h-[1px] bg-[var(--ap-green,#6DB33F)]" />
      </motion.div>
    </div>
  );
}

export default BrandFooter;
