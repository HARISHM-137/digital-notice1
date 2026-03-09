interface AttainmentGaugeProps {
    value: number;
    maxValue?: number;
    label: string;
    size?: "sm" | "md" | "lg";
}

const sizeClasses = {
    sm: { container: "w-20 h-20", text: "text-lg" },
    md: { container: "w-28 h-28", text: "text-2xl" },
    lg: { container: "w-36 h-36", text: "text-3xl" },
};

export default function AttainmentGauge({
    value,
    maxValue = 100,
    label,
    size = "md",
}: AttainmentGaugeProps) {
    const percentage = (value / maxValue) * 100;
    const circumference = 2 * Math.PI * 45;
    const strokeDasharray = circumference;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    const getColor = () => {
        if (percentage >= 70) return "text-green-500";
        if (percentage >= 50) return "text-yellow-500";
        return "text-red-500";
    };

    return (
        <div className="flex flex-col items-center">
            <div className={`relative ${sizeClasses[size].container}`}>
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    {/* Background circle */}
                    <circle
                        cx="50"
                        cy="50"
                        r="45"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="8"
                        className="text-slate-200"
                    />
                    {/* Progress circle */}
                    <circle
                        cx="50"
                        cy="50"
                        r="45"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={strokeDasharray}
                        strokeDashoffset={strokeDashoffset}
                        className={`${getColor()} transition-all duration-1000`}
                    />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`${sizeClasses[size].text} font-bold text-slate-800`}>
                        {value}%
                    </span>
                </div>
            </div>
            <p className="mt-2 text-sm font-medium text-slate-600">{label}</p>
        </div>
    );
}
