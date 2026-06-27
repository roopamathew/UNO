import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';

const features = [
  { title: 'Real-Time Multiplayer', desc: 'Play with friends across any device with perfect sync', icon: '🎮' },
  { title: 'Custom House Rules', desc: 'Stack Draw 2, Jump-In, Seven-O and your own custom rules', icon: '📜' },
  { title: 'Voice Chat', desc: 'Push-to-talk WebRTC voice communication built in', icon: '🎙️' },
  { title: 'AI Opponent', desc: 'Challenge an intelligent AI that bluffs and strategizes', icon: '🤖' },
  { title: 'Leaderboards', desc: 'Track wins, streaks, and climb the rankings', icon: '🏆' },
  { title: 'Premium Experience', desc: 'Smooth animations, sound effects, and dark mode', icon: '✨' },
];

export function HomePage() {
  return (
    <div className="relative overflow-hidden">
      {/* Hero */}
      <section className="relative min-h-[90vh] flex items-center justify-center px-4">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(4)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-32 h-48 rounded-2xl opacity-20"
              style={{
                background: ['#E53935', '#1E88E5', '#43A047', '#FDD835'][i],
                left: `${15 + i * 20}%`,
                top: `${20 + (i % 2) * 30}%`,
                rotate: -15 + i * 10,
              }}
              animate={{ y: [0, -20, 0], rotate: [-15 + i * 10, -10 + i * 10, -15 + i * 10] }}
              transition={{ duration: 4 + i, repeat: Infinity, ease: 'easeInOut' }}
            />
          ))}
        </div>

        <div className="relative z-10 text-center max-w-4xl mx-auto">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-6xl md:text-8xl font-display font-bold mb-6"
          >
            <span className="text-gradient">UNO</span>{' '}
            <span className="text-white">Arena</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl md:text-2xl text-white/60 mb-10 max-w-2xl mx-auto"
          >
            The premium multiplayer UNO experience. Play with friends, customize rules, and dominate the leaderboard.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link to="/start">
              <Button size="lg">Start Playing</Button>
            </Link>
            <Link to="/join">
              <Button variant="secondary" size="lg">Join Room</Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 py-20">
        <h2 className="text-3xl font-display font-bold text-center mb-12">
          Everything You Need
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              viewport={{ once: true }}
            >
              <GlassCard hover className="h-full">
                <span className="text-4xl mb-4 block">{feature.icon}</span>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-white/50 text-sm">{feature.desc}</p>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
