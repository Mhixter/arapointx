import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

/**
 * Scene 5 — Buy result-checker PINs.
 *
 * Phone frame shows the PIN purchase flow: exam selector → PIN reveal card
 * → receipt confirmation. Right column shows the catalog of PINs available.
 *
 * Allotted: 16_000 ms. All phase timers stay <= 15_500 ms.
 */
export function Scene5() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),    // eyebrow + headline + phone
      setTimeout(() => setPhase(2), 2200),   // PIN catalog reveal
      setTimeout(() => setPhase(3), 4400),   // WAEC selected on phone
      setTimeout(() => setPhase(4), 6800),   // PIN reveal animation
      setTimeout(() => setPhase(5), 9200),   // receipt toast
      setTimeout(() => setPhase(6), 11600),  // closing line
      setTimeout(() => setPhase(7), 15400),  // exit prep
    ];
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  const catalog = [
    { name: 'WAEC Result Checker', price: '₦3,500', brand: '#016B3A' },
    { name: 'NECO Result Checker', price: '₦1,800', brand: '#1E40AF' },
    { name: 'JAMB Result PIN', price: '₦1,000', brand: '#B91C1C' },
    { name: 'NABTEB Result Checker', price: '₦2,000', brand: '#C2410C' },
  ];

  // Sample WAEC-style scratch-card token, masked then revealed.
  const PIN_DIGITS = ['8419', '2076', '5530', '9148'];

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center overflow-hidden bg-[#0A1628]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 30% 35%, rgba(212,162,76,0.12) 0%, transparent 55%), radial-gradient(ellipse at 75% 65%, rgba(28,58,107,0.40) 0%, transparent 55%)',
        }}
      />

      <div className="relative z-10 flex items-center gap-[3.5vw] w-[88vw]">
        {/* Phone frame */}
        <motion.div
          className="relative w-[20vw] h-[40vw] rounded-[2.4vw] flex-shrink-0"
          style={{
            background: 'linear-gradient(160deg, #1C3A6B 0%, #0F2346 60%, #0A1628 100%)',
            border: '1px solid rgba(212,162,76,0.45)',
            boxShadow: '0 30px 80px -20px rgba(0,0,0,0.7), inset 0 0 60px rgba(212,162,76,0.05)',
          }}
          initial={{ opacity: 0, y: 30, rotate: -3 }}
          animate={phase >= 1 ? { opacity: 1, y: 0, rotate: -3 } : { opacity: 0, y: 30, rotate: -3 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        >
          <div
            className="absolute top-[1vw] left-1/2 -translate-x-1/2 w-[5vw] h-[0.6vw] rounded-full"
            style={{ background: '#0A1628' }}
          />
          <div
            className="absolute inset-[1vw] top-[2vw] rounded-[1.6vw] overflow-hidden"
            style={{ background: 'linear-gradient(180deg, #0A1628 0%, #0F2346 100%)' }}
          >
            <div
              className="px-[1.2vw] pt-[1.4vw] text-[0.78vw] tracking-[0.32em] uppercase font-bold"
              style={{ color: '#D4A24C', fontFamily: "'Inter', sans-serif" }}
            >
              Arapoint · PIN
            </div>
            <div
              className="px-[1.2vw] mt-[0.4vw] text-[1.15vw] font-bold text-white leading-tight"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              Result-checker PIN
            </div>

            {/* Selected exam summary */}
            <motion.div
              className="mx-[1vw] mt-[1.2vw] rounded-[0.6vw] p-[0.7vw] flex items-center gap-[0.7vw]"
              style={{
                background: 'rgba(1,107,58,0.12)',
                border: '1px solid rgba(1,107,58,0.55)',
              }}
              initial={{ opacity: 0, y: 8 }}
              animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
              transition={{ duration: 0.5 }}
            >
              <div
                className="w-[1.8vw] h-[1.8vw] rounded-[0.3vw] flex items-center justify-center text-[0.7vw] font-black"
                style={{ background: '#016B3A', color: 'white', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                W
              </div>
              <div className="flex-1">
                <div
                  className="text-[0.78vw] font-bold text-white"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  WAEC Checker
                </div>
                <div
                  className="text-[0.6vw] text-white/55"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
                  May/June · 2026
                </div>
              </div>
              <div
                className="text-[0.85vw] font-black"
                style={{ color: '#6DB33F', fontFamily: "'JetBrains Mono', monospace" }}
              >
                ₦3,500
              </div>
            </motion.div>

            {/* PIN reveal */}
            <motion.div
              className="mx-[1vw] mt-[1vw] rounded-[0.6vw] p-[0.9vw] relative overflow-hidden"
              style={{
                background:
                  'linear-gradient(160deg, rgba(212,162,76,0.18) 0%, rgba(212,162,76,0.06) 100%)',
                border: '1px solid rgba(212,162,76,0.6)',
              }}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={phase >= 3 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div
                className="text-[0.55vw] tracking-[0.32em] uppercase font-bold"
                style={{ color: '#D4A24C', fontFamily: "'Inter', sans-serif" }}
              >
                Your PIN
              </div>
              <div
                className="mt-[0.4vw] flex items-center gap-[0.4vw]"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {PIN_DIGITS.map((seg, i) => (
                  <div
                    key={i}
                    className="px-[0.5vw] py-[0.4vw] rounded-[0.3vw] text-center font-black text-[0.95vw]"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(212,162,76,0.45)',
                      color: 'white',
                      minWidth: '2.6vw',
                    }}
                  >
                    {phase >= 4 ? seg : '••••'}
                  </div>
                ))}
              </div>
              <div
                className="mt-[0.4vw] text-[0.55vw] tracking-[0.25em] uppercase font-bold"
                style={{ color: phase >= 4 ? '#6DB33F' : 'rgba(255,255,255,0.45)', fontFamily: "'Inter', sans-serif" }}
              >
                {phase >= 4 ? 'Delivered · saved to wallet' : 'Awaiting payment confirmation'}
              </div>
            </motion.div>

            {/* Receipt toast */}
            <motion.div
              className="absolute bottom-[1vw] left-[1vw] right-[1vw] flex items-center gap-[0.5vw] rounded-[0.5vw] px-[0.7vw] py-[0.6vw]"
              style={{
                background: 'rgba(109,179,63,0.18)',
                border: '1px solid rgba(109,179,63,0.6)',
              }}
              initial={{ opacity: 0, y: 14 }}
              animate={phase >= 5 ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
              transition={{ duration: 0.5 }}
            >
              <div
                className="w-[1vw] h-[1vw] rounded-full flex items-center justify-center text-[0.65vw] font-black"
                style={{ background: '#6DB33F', color: 'white' }}
              >
                ✓
              </div>
              <div className="flex-1">
                <div
                  className="text-[0.7vw] font-bold text-white leading-tight"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  Receipt sent to your email
                </div>
                <div
                  className="text-[0.55vw] text-white/65"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
                  REF · ARP-PIN-49217
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Right column */}
        <div className="flex-1 flex flex-col">
          <motion.div
            className="text-[0.95vw] tracking-[0.42em] uppercase font-bold mb-[0.6vw]"
            style={{ color: '#D4A24C', fontFamily: "'Inter', sans-serif" }}
            initial={{ opacity: 0, y: 10 }}
            animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
            transition={{ duration: 0.6 }}
          >
            Need a PIN?
          </motion.div>

          <motion.h2
            className="text-[3.2vw] font-black text-white leading-[1.05] tracking-tight"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            initial={{ opacity: 0, y: 16 }}
            animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          >
            Buy any exam PIN —{' '}
            <span style={{ color: '#D4A24C' }}>secure, instant, official.</span>
          </motion.h2>

          {/* Catalog */}
          <div className="mt-[2vw] grid grid-cols-2 gap-[1vw]">
            {catalog.map((c, i) => (
              <motion.div
                key={c.name}
                className="rounded-[0.6vw] px-[1vw] py-[1vw]"
                style={{
                  background: 'rgba(15,35,70,0.55)',
                  border: `1px solid ${c.brand}88`,
                  borderLeft: `0.4vw solid ${c.brand}`,
                  boxShadow: `0 12px 30px -12px ${c.brand}66`,
                }}
                initial={{ opacity: 0, y: 12 }}
                animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
                transition={{ delay: 0.1 * i, duration: 0.55 }}
              >
                <div className="flex items-center justify-between">
                  <div
                    className="text-[1.15vw] font-bold text-white"
                    style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  >
                    {c.name}
                  </div>
                  <div
                    className="text-[1.1vw] font-black"
                    style={{ color: '#D4A24C', fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {c.price}
                  </div>
                </div>
                <div
                  className="text-[0.78vw] text-white/60 mt-[0.3vw]"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
                  Instant delivery · saved to your wallet
                </div>
              </motion.div>
            ))}
          </div>

          {/* Trust strip */}
          <motion.div
            className="mt-[1.6vw] flex flex-wrap gap-[0.6vw]"
            initial={{ opacity: 0 }}
            animate={phase >= 6 ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.6 }}
          >
            {['No fake vendors', 'No scratch-card hunting', 'Receipts on every purchase'].map((t) => (
              <div
                key={t}
                className="px-[0.9vw] py-[0.4vw] rounded-full text-[0.95vw] font-semibold"
                style={{
                  background: 'rgba(212,162,76,0.10)',
                  border: '1px solid rgba(212,162,76,0.45)',
                  color: '#F5C977',
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                {t}
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
