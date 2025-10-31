import React from 'react';

interface ToggleSwitchProps {
    id: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    label: string;
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ id, checked, onChange, label }) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange(e.target.checked);
    };

    return (
        <label htmlFor={id} className="toggle-switch" aria-label={label}>
            <input
                id={id}
                type="checkbox"
                className="toggle-switch-input"
                checked={checked}
                onChange={handleChange}
            />
            <span className="toggle-switch-slider"></span>
        </label>
    );
};