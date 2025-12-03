// components/Dashboard/SummaryCard.tsx
"use client";

interface SummaryCardProps {
  title: string;
  value: string | number;
  color?: string;
  subtitle?: string;
}

export default function SummaryCard({ title, value, color = "text-gray-900", subtitle }: SummaryCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-md p-4 flex flex-col justify-between border hover:shadow-lg transition">
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className={`text-3xl sm:text-4xl font-bold mt-2 ${color}`}>{value}</p>
      {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
    </div>
  );
}
