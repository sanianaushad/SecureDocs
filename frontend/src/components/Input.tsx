type InputProps = {
  label: string;
  type: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
};

function Input({
  label,
  type,
  placeholder,
  value,
  onChange,
}: InputProps) {
  return (
    <div className="form-group">
      <label>{label}</label>

      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

export default Input;