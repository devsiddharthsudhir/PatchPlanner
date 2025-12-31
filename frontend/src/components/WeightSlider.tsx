import * as Slider from "@radix-ui/react-slider";

type Props = {
  label: string;
  value: number;
  onChange: (v: number) => void;
  hint: string;
};

export default function WeightSlider({ label, value, onChange, hint }: Props) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <div className="font-medium">{label}</div>
        <div className="text-sm text-zinc-300 tabular-nums">{value}</div>
      </div>

      <Slider.Root
        className="relative flex h-5 w-full touch-none select-none items-center"
        value={[value]}
        min={0}
        max={100}
        step={1}
        onValueChange={(v) => onChange(v[0] ?? 0)}
      >
        <Slider.Track className="relative h-1 w-full grow overflow-hidden rounded-full bg-zinc-800">
          <Slider.Range className="absolute h-full bg-zinc-200" />
        </Slider.Track>
        <Slider.Thumb className="block h-4 w-4 rounded-full bg-white shadow ring-1 ring-zinc-800 focus:outline-none" />
      </Slider.Root>

      <div className="text-xs text-zinc-400">{hint}</div>
    </div>
  );
}
