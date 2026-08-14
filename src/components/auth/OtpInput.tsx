"use client";

import React, { useRef } from "react";

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: boolean;
}

const OtpInput: React.FC<OtpInputProps> = ({ value, onChange, error }) => {
  const inputs_ref = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.padEnd(6, " ").split("").slice(0, 6);

  const handleChange = (index: number, char: string) => {
    const clean = char.replace(/\D/g, "").slice(-1);
    const new_digits = [...digits];
    new_digits[index] = clean || " ";
    onChange(new_digits.join("").trimEnd());
    if (clean && index < 5) {
      inputs_ref.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (digits[index].trim()) {
        const new_digits = [...digits];
        new_digits[index] = " ";
        onChange(new_digits.join("").trimEnd());
      } else if (index > 0) {
        inputs_ref.current[index - 1]?.focus();
      }
    }
    if (e.key === "ArrowLeft" && index > 0) inputs_ref.current[index - 1]?.focus();
    if (e.key === "ArrowRight" && index < 5) inputs_ref.current[index + 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    onChange(pasted);
    inputs_ref.current[Math.min(pasted.length, 5)]?.focus();
  };

  return (
    <div className="flex justify-center gap-2">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <input
          key={i}
          ref={(el) => { inputs_ref.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digits[i].trim()}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          className={`h-14 w-12 rounded-xl border text-center text-xl font-semibold transition-all focus:outline-none focus:ring-2 ${
            error
              ? "border-error-400 bg-error-50 text-error-700 focus:border-error-500 focus:ring-error-200 dark:border-error-500 dark:bg-error-500/10 dark:text-error-400"
              : "border-gray-300 bg-white text-gray-900 focus:border-brand-500 focus:ring-brand-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-brand-500 dark:focus:ring-brand-500/20"
          }`}
        />
      ))}
    </div>
  );
};

export default OtpInput;
