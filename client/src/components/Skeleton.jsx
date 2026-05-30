import React from 'react';
import { motion } from 'framer-motion';

export const Skeleton = ({ className = "" }) => {
  return (
    <motion.div
      className={`bg-gray-700/50 rounded animate-pulse ${className}`}
      initial={{ opacity: 0.5 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
    />
  );
};
