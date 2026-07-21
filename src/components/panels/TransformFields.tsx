import type { Vec3 } from "../../domain/projectTypes";

type TransformFieldsProps = {
  disabled?: boolean;
  label: string;
  max?: number;
  min?: number;
  precision?: number;
  step?: number;
  value: Vec3;
  onChange: (value: Vec3) => void;
};

function formatAxisValue(value: number, precision: number) {
  const threshold = 1 / 10 ** precision / 2;
  const normalized = Math.abs(value) < threshold ? 0 : value;
  return Number(normalized.toFixed(precision));
}

export function TransformFields({
  disabled = false,
  label,
  max,
  min,
  precision = 2,
  step = 0.1,
  value,
  onChange,
}: TransformFieldsProps) {
  const updateAxis = (axisIndex: number, nextValue: number) => {
    const next = [...value] as Vec3;
    const finiteValue = Number.isFinite(nextValue) ? nextValue : 0;
    next[axisIndex] = Math.min(
      max ?? Number.POSITIVE_INFINITY,
      Math.max(min ?? Number.NEGATIVE_INFINITY, finiteValue),
    );
    onChange(next);
  };

  return (
    <div className="field-group">
      <label>{label}</label>
      <div className="axis-fields editable">
        {(["X", "Y", "Z"] as const).map((axis, index) => (
          <label className="axis-field" key={axis}>
            <span>{axis}</span>
            <input
              disabled={disabled}
              max={max}
              min={min}
              step={step}
              type="number"
              value={formatAxisValue(value[index], precision)}
              onChange={(event) => updateAxis(index, Number(event.target.value))}
            />
          </label>
        ))}
      </div>
    </div>
  );
}
