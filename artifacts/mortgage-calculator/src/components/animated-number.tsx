import React, { useEffect, useState } from "react";
import { motion, useSpring, useTransform } from "framer-motion";

export function AnimatedNumber({
  value,
  format = (v) => v.toString(),
  className = "",
}: {
  value: number;
  format?: (value: number) => string;
  className?: string;
}) {
  const spring = useSpring(value, { stiffness: 100, damping: 20 });
  const display = useTransform(spring, (current) => format(current));
  
  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  return <motion.span className={className}>{display}</motion.span>;
}