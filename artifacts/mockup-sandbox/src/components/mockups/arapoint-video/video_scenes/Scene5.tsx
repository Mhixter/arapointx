import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

const ENDPOINTS = [
  {
    method: 'POST',
    path: '/v1/verify/nin',
    body: `{
  "nin": "12345678901"
}`,
    response: `{
  "status": "success",
  "data": {
    "firstname": "CHUKWUEMEKA",
    "lastname": "OKONKWO",
    "dob": "1990-05-14",
    "gender": "male",
    "verified": true
  }
}`,
    badge: 'NIN',
    cost: '₦130'
  },
  {
    method: 'POST',
    path: '/v1/verify/employment',
    body: `{
  "nin": "12345678901",
  "bvn": "22345678901",
  "ssce": {
    "provider": "WAEC",
    "cardPin": "WXN-xxxx",
    "cardSerialNumber": "SN-xxxx"
  }
}`,
    response: `{
  "requestId": "req_abc123",
  "decision": "PASS",
  "trustScore": 91,
  "breakdown": {
    "nin": 20, "bvn": 20,
    "nameMatch": 19, "ssce": 15
  }
}`,
    badge: 'EMPLOYMENT',
    cost: '₦350'
  }
];

export function Scene5() {
  const [phase, setPhase] = useState(0);
  const [epIdx, setEpIdx] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 200),
      setTimeout(() => setPhase(2), 700),
      setTimeout(() => setPhase(3), 1800),
      setTimeout(() => setEpIdx(1), 2900),
      setTimeout(() => setPhase(4), 3100),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  const ep = ENDPOINTS[epIdx];

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center"
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, filter: 'blur(8px)' }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="absolute inset-0 z-0 opacity-20">
        <video
          src={`${import.meta.env.BASE_URL}videos/data-grid.mp4`}
          className="w-full h-full object-cover"
          autoPlay muted loop playsInline
        />
      </div>

      <div className="relative z-10 w-full max-w-[85vw]">

        <motion.div
          className="text-center mb-[2vw]"
          initial={{ opacity: 0, y: -15 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: -15 }}
          transition={{ duration: 0.5 }}
        >
          <div className="text-[1vw] tracking-[0.3em] text-[#6DB33F] mb-[0.5vw] font-mono uppercase">Developer API</div>
          <h2 className="text-[3.5vw] font-black text-white leading-none tracking-tight">
            ONE API KEY. <span className="text-[#6DB33F]">EVERY CHECK.</span>
          </h2>
          <div className="mt-[0.8vw] text-[1.1vw] font-mono text-white/40">
            api.arapoint.com.ng &nbsp;·&nbsp; developer.arapoint.com.ng
          </div>
        </motion.div>

        <div className="flex gap-[2vw] w-full">

          {/* Request Panel */}
          <motion.div
            className="flex-1 bg-[#060E1E] rounded-[0.8vw] border border-white/10 overflow-hidden"
            initial={{ x: -40, opacity: 0 }}
            animate={phase >= 2 ? { x: 0, opacity: 1 } : { x: -40, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 22 }}
          >
            {/* Tab bar */}
            <div className="h-[2.8vw] bg-white/5 flex items-center px-[1.2vw] gap-[1.5vw] border-b border-white/5">
              <div className="flex gap-[0.4vw]">
                <div className="w-[0.7vw] h-[0.7vw] rounded-full bg-red-500/70" />
                <div className="w-[0.7vw] h-[0.7vw] rounded-full bg-yellow-400/70" />
                <div className="w-[0.7vw] h-[0.7vw] rounded-full bg-green-500/70" />
              </div>
              <div className="flex gap-[1vw]">
                <motion.div
                  animate={{ opacity: epIdx === 0 ? 1 : 0.4, borderBottomColor: epIdx === 0 ? '#6DB33F' : 'transparent' }}
                  className="text-[0.85vw] font-mono text-white/80 border-b pb-[0.2vw]"
                >NIN Verify</motion.div>
                <motion.div
                  animate={{ opacity: epIdx === 1 ? 1 : 0.4, borderBottomColor: epIdx === 1 ? '#6DB33F' : 'transparent' }}
                  className="text-[0.85vw] font-mono text-white/80 border-b pb-[0.2vw]"
                >Employment</motion.div>
              </div>
            </div>

            {/* Request content */}
            <div className="p-[1.5vw] font-mono text-[1.05vw]">
              <div className="flex items-center gap-[0.8vw] mb-[1.2vw]">
                <motion.span
                  key={ep.method + epIdx}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-[0.85vw] font-bold bg-[#6DB33F]/20 text-[#6DB33F] px-[0.8vw] py-[0.3vw] rounded"
                >
                  {ep.method}
                </motion.span>
                <motion.span
                  key={ep.path + epIdx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-white/60 text-[0.9vw]"
                >
                  {ep.path}
                </motion.span>
              </div>

              <div className="mb-[1vw] text-[0.9vw]">
                <div className="text-white/30 mb-[0.4vw] text-[0.8vw] uppercase tracking-widest">Headers</div>
                <div><span className="text-[#93c5fd]">X-API-Key</span>: <span className="text-yellow-300/80">dev_xxxxxxxxxxxxxx</span></div>
                <div><span className="text-[#93c5fd]">Content-Type</span>: <span className="text-white/50">application/json</span></div>
              </div>

              <div className="text-[0.9vw]">
                <div className="text-white/30 mb-[0.4vw] text-[0.8vw] uppercase tracking-widest">Body</div>
                <motion.pre
                  key={'body' + epIdx}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4 }}
                  className="text-white/70 leading-relaxed whitespace-pre"
                >
                  {ep.body}
                </motion.pre>
              </div>
            </div>
          </motion.div>

          {/* Response Panel */}
          <motion.div
            className="flex-1 bg-[#051510] rounded-[0.8vw] border border-[#6DB33F]/20 overflow-hidden"
            initial={{ x: 40, opacity: 0 }}
            animate={phase >= 3 ? { x: 0, opacity: 1 } : { x: 40, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 22 }}
          >
            <div className="h-[2.8vw] bg-[#6DB33F]/10 flex items-center justify-between px-[1.2vw] border-b border-[#6DB33F]/10">
              <span className="text-[#6DB33F] text-[0.85vw] font-bold font-mono tracking-wider">202 ACCEPTED</span>
              <motion.span
                key={'badge' + epIdx}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-[0.7vw] font-bold bg-[#6DB33F]/20 text-[#6DB33F] px-[0.8vw] py-[0.2vw] rounded-full font-mono"
              >
                {ep.badge} · {ep.cost}
              </motion.span>
            </div>
            <div className="p-[1.5vw]">
              <motion.pre
                key={'resp' + epIdx}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-green-400/80 font-mono text-[0.9vw] leading-relaxed whitespace-pre"
              >
                {ep.response}
              </motion.pre>
            </div>
          </motion.div>
        </div>

        {/* Pricing footer */}
        <motion.div
          className="flex justify-center gap-[2.5vw] mt-[1.5vw]"
          initial={{ opacity: 0 }}
          animate={phase >= 2 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ delay: 0.5 }}
        >
          {['NIN — ₦130', 'BVN — ₦80', 'Education — ₦250', 'Employment — ₦350', 'Fraud Score — ₦50'].map((item) => (
            <span key={item} className="text-[0.8vw] font-mono text-white/30">{item}</span>
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
}
