type Props = {
  onPick: (w: { risk: number; cost: number; outage: number }) => void;
};

function PresetButton({
  label,
  onClick,
  variant = "outline",
}: {
  label: string;
  onClick: () => void;
  variant?: "outline" | "solid";
}) {
  const base =
    "px-3 py-2 rounded-xl text-sm border transition active:scale-[0.99]";
  const styles =
    variant === "solid"
      ? "bg-white text-black border-white hover:bg-zinc-200"
      : "bg-transparent text-zinc-200 border-zinc-700 hover:border-zinc-500";
  return (
    <button className={`${base} ${styles}`} onClick={onClick} type="button">
      {label}
    </button>
  );
}

export default function ScenarioPresets({ onPick }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      <PresetButton label="Risk-first" onClick={() => onPick({ risk: 70, cost: 15, outage: 15 })} />
      <PresetButton label="Cost-first" onClick={() => onPick({ risk: 20, cost: 60, outage: 20 })} />
      <PresetButton label="Outage-first" onClick={() => onPick({ risk: 20, cost: 20, outage: 60 })} />
      <PresetButton label="Balanced" variant="solid" onClick={() => onPick({ risk: 33, cost: 33, outage: 33 })} />
    </div>
  );
}
