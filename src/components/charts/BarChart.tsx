interface BarChartProps {
    data: { label: string; value: number; color?: string }[];
    title?: string;
    maxValue?: number;
}

export default function BarChart({ data, title, maxValue = 100 }: BarChartProps) {
    const colors = [
        "bg-primary-500",
        "bg-secondary-500",
        "bg-blue-500",
        "bg-green-500",
        "bg-yellow-500",
        "bg-purple-500",
        "bg-pink-500",
        "bg-orange-500",
    ];

    return (
        <div className="bg-white rounded-xl shadow-md p-6">
            {title && <h3 className="text-lg font-semibold text-slate-800 mb-6">{title}</h3>}
            <div className="space-y-4">
                {data.map((item, idx) => (
                    <div key={item.label} className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="font-medium text-slate-700">{item.label}</span>
                            <span className="text-slate-500">{item.value}%</span>
                        </div>
                        <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                            <div
                                className={`h-full ${item.color || colors[idx % colors.length]} rounded-full transition-all duration-500`}
                                style={{ width: `${(item.value / maxValue) * 100}%` }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
