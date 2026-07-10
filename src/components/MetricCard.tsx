import React from 'react';

interface MetricCardProps {
  title: string;
  score: number;
  icon: React.ReactNode;
  color: string;
}

export function MetricCard({ title, score, icon, color }: MetricCardProps) {
  return (
    <div className="elevated-panel rounded-2xl p-6 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(2,6,23,0.26)]">
      <div className="flex justify-between items-start mb-4">
        <div className="elevated-panel-soft rounded-xl p-3">
          {icon}
        </div>
        <span className="text-2xl font-black text-[var(--color-text)]">{score}</span>
      </div>
      <h3 className="text-sm font-bold text-[var(--color-muted)] uppercase tracking-wider mb-2">{title}</h3>
      <div className="w-full bg-[var(--color-outline-variant)] rounded-full h-2">
        <div 
          className={`h-2 rounded-full ${color} transition-all duration-1000`} 
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}
