interface Props {
  label: string;
  value: number;
  onChange: (value: number) => void;
  step?: number;
}

export function InputRow({ label, value, onChange, step = 1 }: Props) {
  return (
    <label className="field">
      <span>{label}</span>
      <input type="number" step={step} value={value} onChange={event => onChange(+event.target.value)} />
    </label>
  );
}
