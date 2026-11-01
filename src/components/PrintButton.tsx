"use client";

export default function PrintButton({ className = "btn" }: { className?: string }) {
  return (
    <button className={className} onClick={() => window.print()} type="button">
      Print
    </button>
  );
}
