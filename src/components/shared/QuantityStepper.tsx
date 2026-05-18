import React from "react";

interface QuantityStepperProps {
  quantity: number;
  onQuantityChange: (quantity: number) => void;
  max_quantity?: number | null;
}

const MIN_TYPED_QTY = 1;

const QuantityStepper: React.FC<QuantityStepperProps> = ({
  quantity,
  onQuantityChange,
  max_quantity,
}) => {
  const [raw_input, setRawInput] = React.useState(String(quantity));
  const [input_error, setInputError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setRawInput(String(quantity));
    setInputError(null);
  }, [quantity]);

  const validate = (
    value: string,
  ): { valid: boolean; parsed: number; error: string | null } => {
    if (value.trim() === "") {
      return { valid: false, parsed: 0, error: "Please enter a quantity" };
    }
    if (!/^\d+$/.test(value.trim())) {
      return { valid: false, parsed: 0, error: "Please enter a whole number" };
    }
    const parsed = parseInt(value.trim(), 10);
    if (parsed < MIN_TYPED_QTY) {
      return { valid: false, parsed, error: "Quantity must be at least 1" };
    }
    if (max_quantity != null && parsed > max_quantity) {
      return {
        valid: false,
        parsed,
        error: `Maximum quantity is ${max_quantity}`,
      };
    }
    return { valid: true, parsed, error: null };
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setRawInput(value);
    const { valid, parsed, error } = validate(value);
    setInputError(error);
    if (valid) {
      onQuantityChange(parsed);
    }
  };

  const handleBlur = () => {
    const { valid } = validate(raw_input);
    if (!valid) {
      setRawInput(String(quantity));
      setInputError(null);
    }
  };

  const handleDecrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    onQuantityChange(Math.max(0, quantity - 1));
  };

  const handleIncrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (max_quantity == null || quantity < max_quantity) {
      onQuantityChange(quantity + 1);
    }
  };

  const at_max = max_quantity != null && quantity >= max_quantity;

  return (
    <div className="flex flex-col items-start gap-1">
      <div
        className="flex items-center gap-1"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={handleDecrement}
          className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-300 text-gray-500 transition-colors hover:border-coral-400 hover:text-coral-500 dark:border-gray-600 dark:text-gray-400"
          aria-label="Decrease quantity"
        >
          <svg width="10" height="2" viewBox="0 0 10 2" fill="none">
            <path
              d="M1 1H9"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>

        <input
          type="text"
          inputMode="numeric"
          value={raw_input}
          onChange={handleInputChange}
          onBlur={handleBlur}
          className={`w-14 rounded-lg border px-2 py-1 text-center text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 dark:bg-gray-900 dark:text-white/90 ${
            input_error
              ? "border-red-400 focus:ring-red-400/20 dark:border-red-500"
              : "border-gray-300 focus:border-coral-400 focus:ring-coral-400/20 dark:border-gray-600"
          }`}
          aria-label="Quantity"
        />

        <button
          type="button"
          onClick={handleIncrement}
          disabled={at_max}
          className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors ${
            at_max
              ? "cursor-not-allowed border border-gray-200 text-gray-300 dark:border-gray-700 dark:text-gray-600"
              : "bg-coral-500 text-white hover:bg-coral-600"
          }`}
          aria-label="Increase quantity"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path
              d="M6 1V11M1 6H11"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      {input_error && (
        <p className="text-xs text-red-500 dark:text-red-400">{input_error}</p>
      )}
    </div>
  );
};

export default QuantityStepper;
