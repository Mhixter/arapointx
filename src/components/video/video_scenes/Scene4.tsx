import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

/**
 * Scene 4 — IPE clearance certificate reveal.
 *
 * Stylized, gold-accented certificate (NOT a 1:1 official seal). Reveals header,
 * holder fields, watermark and a "VERIFIED" lockup. Ends with a caption.
 *
 * Allotted: 18_000 ms. All phase timers stay <= 17_500 ms.
 */
export function Scene4() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),    // eyebrow + cert frame
      setTimeout(() => setPhase(2), 2000),   // header band + emblem
      setTimeout(() => setPhase(3), 4200),   // title text
      setTimeout(() => setPhase(4), 6200),   // holder name + ref
      setTimeout(() => setPhase(5), 8800),   // detail rows
      setTimeout(() => setPhase(6), 11600),  // signature + verified seal
      setTimeout(() => setPhase(7), 14000),  // caption
      setTimeout(() => setPhase(8), 17400),  // exit prep
    ];
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  const detailRows = [
    { label: 'Reference No.', value: 'IPE / 2026 / 048217' },
    { label: 'Date of Birth', value: '14 Mar 1992' },
    { label: 'Date Issued', value: '02 May 2026' },
    { label: 'Validity', value: '12 months' },
  ];

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center overflow-hidden"
      initial={{ opacity: 0, scale: 1.02 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Warm gold ambient — official feel */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 35%, rgba(212,162,76,0.18) 0%, transparent 55%), radial-gradient(ellipse at 50% 90%, rgba(10,22,40,0.95) 0%, transparent 60%)',
        }}
      />

      <div className="relative z-10 flex flex-col items-center w-[80vw]">
        <motion.div
          className="text-[0.95vw] tracking-[0.42em] uppercase font-bold mb-[1vw]"
          style={{ color: '#D4A24C', fontFamily: "'Inter', sans-serif" }}
          initial={{ opacity: 0, y: 10 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
          transition={{ duration: 0.6 }}
        >
          Document #1 · IPE Clearance
        </motion.div>

        {/* Certificate frame */}
        <motion.div
          className="relative w-[60vw] h-[34vw] rounded-[0.6vw] overflow-hidden"
          style={{
            background:
              'linear-gradient(160deg, #FBF5E6 0%, #F3E7C9 50%, #E8D7A8 100%)',
            boxShadow:
              '0 30px 80px -20px rgba(0,0,0,0.7), inset 0 0 0 0.7vw #D4A24C, inset 0 0 0 0.85vw #FBF5E6, inset 0 0 0 1.1vw #D4A24C',
            color: '#3A2E14',
          }}
          initial={{ opacity: 0, y: 30, rotateX: 14 }}
          animate={
            phase >= 1
              ? { opacity: 1, y: 0, rotateX: 0 }
              : { opacity: 0, y: 30, rotateX: 14 }
          }
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Diagonal ARAPOINT watermark */}
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
            style={{ transform: 'rotate(-22deg)' }}
          >
            <div
              className="text-[8vw] font-black tracking-[0.1em]"
              style={{
                color: 'rgba(212,162,76,0.10)',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}
            >
              ARAPOINT
            </div>
          </div>

          {/* Guilloche curves */}
          <svg
            className="absolute inset-0 w-full h-full opacity-30 pointer-events-none"
            viewBox="0 0 600 340"
            preserveAspectRatio="none"
          >
            {Array.from({ length: 28 }).map((_, i) => (
              <path
                key={i}
                d={`M0,${20 + i * 11} Q150,${10 + i * 10} 300,${20 + i * 11} T600,${20 + i * 11}`}
                stroke="#D4A24C"
                strokeWidth="0.4"
                fill="none"
              />
            ))}
          </svg>

          {/* Header band */}
          <motion.div
            className="absolute top-[1.3vw] left-[1.3vw] right-[1.3vw] flex items-center justify-between px-[1.4vw] py-[0.9vw] rounded-[0.3vw]"
            style={{
              background: 'linear-gradient(90deg, #0F2346 0%, #1C3A6B 50%, #0F2346 100%)',
              borderTop: '1.5px solid #D4A24C',
              borderBottom: '1.5px solid #D4A24C',
            }}
            initial={{ opacity: 0, y: -8 }}
            animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: -8 }}
            transition={{ duration: 0.6 }}
          >
            <div
              className="text-[0.95vw] tracking-[0.32em] uppercase font-bold text-white"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              Issued via Arapoint
            </div>
            <div
              className="text-[0.85vw] tracking-[0.3em] uppercase font-semibold"
              style={{ color: '#D4A24C', fontFamily: "'Inter', sans-serif" }}
            >
              REF · IPE / 2026
            </div>
          </motion.div>

          {/* Stylized shield emblem */}
          <motion.div
            className="absolute top-[5.4vw] left-1/2 -translate-x-1/2"
            initial={{ opacity: 0, scale: 0.6, rotate: -12 }}
            animate={
              phase >= 2
                ? { opacity: 1, scale: 1, rotate: 0 }
                : { opacity: 0, scale: 0.6, rotate: -12 }
            }
            transition={{ type: 'spring', stiffness: 180, damping: 16, delay: 0.2 }}
          >
            <svg viewBox="0 0 80 90" className="w-[5vw] h-[5.5vw]">
              <defs>
                <linearGradient id="ipeShieldGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F5C977" />
                  <stop offset="100%" stopColor="#A8782F" />
                </linearGradient>
              </defs>
              <path
                d="M40 4 L72 14 V42 C72 64 56 80 40 86 C24 80 8 64 8 42 V14 Z"
                fill="url(#ipeShieldGrad)"
                stroke="#0F2346"
                strokeWidth="1.5"
              />
              <text
                x="40"
                y="46"
                textAnchor="middle"
                fontFamily="Plus Jakarta Sans, sans-serif"
                fontWeight="900"
                fontSize="14"
                fill="#0F2346"
                letterSpacing="2"
              >
                IPE
              </text>
              <text
                x="40"
                y="62"
                textAnchor="middle"
                fontFamily="Inter, sans-serif"
                fontWeight="700"
                fontSize="6"
                fill="#0F2346"
                letterSpacing="1.5"
              >
                CLEARANCE
              </text>
            </svg>
          </motion.div>

          {/* Title */}
          <motion.div
            className="absolute top-[11.4vw] left-0 right-0 text-center"
            initial={{ opacity: 0, y: 10 }}
            animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
            transition={{ duration: 0.7 }}
          >
            <div
              className="text-[0.85vw] tracking-[0.42em] uppercase font-bold"
              style={{ color: '#7A5A1F', fontFamily: "'Inter', sans-serif" }}
            >
              Certificate of
            </div>
            <div
              className="text-[2.6vw] font-black tracking-[0.04em] mt-[0.1vw]"
              style={{
                color: '#0F2346',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}
            >
              POLICE CHARACTER CLEARANCE
            </div>
            <div
              className="mt-[0.4vw] mx-auto h-[0.12vw] w-[14vw]"
              style={{ background: '#D4A24C' }}
            />
          </motion.div>

          {/* Holder name + ref */}
          <motion.div
            className="absolute top-[18vw] left-[3vw] right-[3vw] text-center"
            initial={{ opacity: 0, y: 10 }}
            animate={phase >= 4 ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
            transition={{ duration: 0.7 }}
          >
            <div
              className="text-[0.85vw] tracking-[0.32em] uppercase font-semibold"
              style={{ color: '#7A5A1F', fontFamily: "'Inter', sans-serif" }}
            >
              This is to certify that
            </div>
            <div
              className="text-[2.4vw] font-black mt-[0.1vw]"
              style={{
                color: '#0F2346',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}
            >
              ADAEZE OKONKWO
            </div>
            <div
              className="text-[1vw] mt-[0.2vw] font-medium max-w-[40vw] mx-auto"
              style={{ color: '#3A2E14', fontFamily: "'Inter', sans-serif" }}
            >
              has no adverse criminal record on file with the relevant authorities as at the date of issue.
            </div>
          </motion.div>

          {/* Detail rows */}
          <div className="absolute bottom-[4.6vw] left-[3vw] right-[3vw] grid grid-cols-2 gap-x-[2vw] gap-y-[0.6vw]">
            {detailRows.map((r, i) => (
              <motion.div
                key={r.label}
                className="flex items-baseline justify-between"
                style={{ borderBottom: '1px dashed rgba(122,90,31,0.45)' }}
                initial={{ opacity: 0, y: 8 }}
                animate={phase >= 5 ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
                transition={{ delay: 0.1 * i, duration: 0.5 }}
              >
                <div
                  className="text-[0.78vw] tracking-[0.3em] uppercase font-bold"
                  style={{ color: '#7A5A1F', fontFamily: "'Inter', sans-serif" }}
                >
                  {r.label}
                </div>
                <div
                  className="text-[1.1vw] font-bold"
                  style={{
                    color: '#0F2346',
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  {r.value}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Signature + verified seal */}
          <motion.div
            className="absolute bottom-[1.3vw] left-[3vw]"
            initial={{ opacity: 0, y: 8 }}
            animate={phase >= 6 ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
            transition={{ duration: 0.6 }}
          >
            <div
              className="text-[1.4vw] italic font-bold"
              style={{
                color: '#0F2346',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                transform: 'rotate(-4deg)',
              }}
            >
              C. Adesina
            </div>
            <div className="h-[0.1vw] w-[10vw]" style={{ background: '#0F2346' }} />
            <div
              className="text-[0.72vw] tracking-[0.3em] uppercase font-bold mt-[0.2vw]"
              style={{ color: '#7A5A1F', fontFamily: "'Inter', sans-serif" }}
            >
              Authorized Officer
            </div>
          </motion.div>

          <motion.div
            className="absolute bottom-[1.4vw] right-[3vw] flex flex-col items-center"
            initial={{ opacity: 0, scale: 0.6, rotate: -12 }}
            animate={
              phase >= 6
                ? { opacity: 1, scale: 1, rotate: -8 }
                : { opacity: 0, scale: 0.6, rotate: -12 }
            }
            transition={{ type: 'spring', stiffness: 180, damping: 16 }}
          >
            <div
              className="w-[5vw] h-[5vw] rounded-full flex items-center justify-center text-center"
              style={{
                border: '0.25vw solid #0F2346',
                background: 'rgba(212,162,76,0.20)',
              }}
            >
              <div>
                <div
                  className="text-[0.9vw] font-black"
                  style={{
                    color: '#0F2346',
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                  }}
                >
                  VERIFIED
                </div>
                <div
                  className="text-[0.55vw] tracking-[0.25em] uppercase font-bold"
                  style={{ color: '#0F2346', fontFamily: "'Inter', sans-serif" }}
                >
                  ARAPOINT
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Caption */}
        <motion.div
          className="mt-[2vw] text-[1.55vw] text-white/90 text-center font-medium tracking-wide"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          initial={{ opacity: 0, y: 12 }}
          animate={phase >= 7 ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
          transition={{ duration: 0.7 }}
        >
          IPE clearance — official, verifiable,{' '}
          <span style={{ color: '#D4A24C' }} className="font-bold">
            in your dashboard.
          </span>
        </motion.div>
      </div>
    </motion.div>
  );
}
