interface ButtonProps {
    children: React.ReactNode;
    variant?: "primary" | "secondary" | "outline" | "danger" | "ghost";
    size?: "sm" | "md" | "lg";
    onClick?: () => void;
    type?: "button" | "submit" | "reset";
    disabled?: boolean;
    fullWidth?: boolean;
    className?: string;
}

const variantClasses = {
    primary: "bg-primary-600 hover:bg-primary-700 text-white shadow-md hover:shadow-lg",
    secondary: "bg-secondary-600 hover:bg-secondary-700 text-white shadow-md hover:shadow-lg",
    outline: "border-2 border-primary-600 text-primary-600 hover:bg-primary-600 hover:text-white",
    danger: "bg-red-600 hover:bg-red-700 text-white shadow-md hover:shadow-lg",
    ghost: "text-slate-600 hover:bg-slate-100",
};

const sizeClasses = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg",
};

export default function Button({
    children,
    variant = "primary",
    size = "md",
    onClick,
    type = "button",
    disabled = false,
    fullWidth = false,
    className = "",
}: ButtonProps) {
    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            className={`
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${fullWidth ? "w-full" : ""}
        font-medium rounded-lg transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
        >
            {children}
        </button>
    );
}
