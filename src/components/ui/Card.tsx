import React from 'react';

interface StatCardProps {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    trend?: {
        value: number;
        isPositive: boolean;
    };
    color?: "primary" | "secondary" | "success" | "warning" | "danger";
}

interface ContainerCardProps {
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
}

type CardProps = StatCardProps | ContainerCardProps;

function isStatCard(props: CardProps): props is StatCardProps {
    return 'title' in props && 'value' in props && 'icon' in props;
}

const colorClasses = {
    primary: "from-primary-500 to-primary-600",
    secondary: "from-secondary-500 to-secondary-600",
    success: "from-green-500 to-green-600",
    warning: "from-yellow-500 to-yellow-600",
    danger: "from-red-500 to-red-600",
};

export default function Card(props: CardProps) {
    if (isStatCard(props)) {
        const { title, value, icon, trend, color = "primary" } = props;
        return (
            <div className="bg-white rounded-xl shadow-md p-6 card-hover">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-slate-500">{title}</p>
                        <p className="text-3xl font-bold text-slate-800 mt-1">{value}</p>
                        {trend && (
                            <p
                                className={`text-sm mt-2 flex items-center gap-1 ${trend.isPositive ? "text-green-600" : "text-red-600"
                                    }`}
                            >
                                <span>{trend.isPositive ? "↑" : "↓"}</span>
                                <span>{Math.abs(trend.value)}% from last semester</span>
                            </p>
                        )}
                    </div>
                    <div
                        className={`w-14 h-14 rounded-xl bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center text-white shadow-lg`}
                    >
                        {icon}
                    </div>
                </div>
            </div>
        );
    }

    // Container card with children
    const { children, className = "", onClick } = props;
    return (
        <div
            className={`bg-white rounded-xl shadow-md p-6 ${className}`}
            onClick={onClick}
        >
            {children}
        </div>
    );
}
