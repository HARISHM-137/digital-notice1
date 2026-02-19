interface FormInputProps {
    label: string;
    name: string;
    type?: string;
    placeholder?: string;
    value?: string;
    onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
    required?: boolean;
    error?: string;
    options?: { label: string; value: string }[];
    as?: "input" | "select" | "textarea";
}

export default function FormInput({
    label,
    name,
    type = "text",
    placeholder,
    value,
    onChange,
    required = false,
    error,
    options,
    as = "input",
}: FormInputProps) {
    const baseClasses = `form-input ${error ? "border-red-500 focus:ring-red-500" : ""}`;

    return (
        <div className="space-y-1.5">
            <label htmlFor={name} className="block text-sm font-medium text-slate-700">
                {label}
                {required && <span className="text-red-500 ml-1">*</span>}
            </label>

            {as === "select" ? (
                <select
                    id={name}
                    name={name}
                    value={value}
                    onChange={onChange}
                    required={required}
                    className={baseClasses}
                >
                    <option value="">Select {label}</option>
                    {options?.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>
            ) : as === "textarea" ? (
                <textarea
                    id={name}
                    name={name}
                    placeholder={placeholder}
                    value={value}
                    onChange={onChange}
                    required={required}
                    rows={4}
                    className={baseClasses}
                />
            ) : (
                <input
                    id={name}
                    name={name}
                    type={type}
                    placeholder={placeholder}
                    value={value}
                    onChange={onChange}
                    required={required}
                    className={baseClasses}
                />
            )}

            {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
    );
}
