import { motion } from 'framer-motion';
import { cn } from '@/utils/helpers';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export function GlassCard({ children, className, hover }: GlassCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn(hover ? 'glass-hover' : 'glass', 'p-6', className)}
    >
      {children}
    </motion.div>
  );
}
