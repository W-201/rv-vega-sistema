import React, { useId, useRef, useState } from 'react';

// Preserve each form's layout while guarding its asynchronous submission.
export default function AsyncForm({ onSubmit, children, className = '', ...props }) {
    const prefix = useId();
    const [fieldErrors, setFieldErrors] = useState({});
    let fieldIndex = 0;
    const decorate = nodes => React.Children.map(nodes, child => {
        if (!React.isValidElement(child)) return child;
        if (['input', 'select', 'textarea'].includes(child.type)) {
            const key = fieldIndex++;
            const errorId = prefix + '-field-' + key;
            const validate = event => {
                const control = event.currentTarget;
                setFieldErrors(previous => ({ ...previous, [key]: control.validity.valid ? '' : control.validationMessage }));
            };
            return <React.Fragment key={child.key ?? key}>
                {React.cloneElement(child, {
                    'aria-invalid': fieldErrors[key] ? true : undefined,
                    'aria-describedby': [child.props['aria-describedby'], fieldErrors[key] ? errorId : null].filter(Boolean).join(' ') || undefined,
                    onInvalid: event => { child.props.onInvalid?.(event); validate(event); },
                    onBlur: event => { child.props.onBlur?.(event); validate(event); },
                    onChange: event => { child.props.onChange?.(event); if (fieldErrors[key]) validate(event); }
                })}
                {fieldErrors[key] && <p id={errorId} className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors[key]}</p>}
            </React.Fragment>;
        }
        return child.props.children ? React.cloneElement(child, {}, decorate(child.props.children)) : child;
    });
    const pending = useRef(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const errorRef = useRef(null);
    const submit = async event => {
        event.preventDefault();
        if (pending.current) return;
        pending.current = true;
        setSaving(true);
        setError('');
        try {
            await onSubmit(event);
        } catch (err) {
            setError(err.message || 'No se pudo guardar. Tus datos siguen aquí; inténtalo de nuevo.');
            requestAnimationFrame(() => errorRef.current?.focus());
        } finally {
            pending.current = false;
            setSaving(false);
        }
    };
    return <form {...props} onSubmit={submit} aria-busy={saving} className={`${className} comfortable-form`}>
        {error && <div ref={errorRef} tabIndex={-1} role="alert" className="shrink-0 rounded-lg border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950 p-3 text-sm text-red-700 dark:text-red-200">{error}</div>}
        <fieldset disabled={saving} className="contents border-0 m-0 p-0 min-w-0">{decorate(children)}</fieldset>
        {saving && <p role="status" className="shrink-0 p-3 text-sm text-blue-700 dark:text-blue-300">Guardando… Espera un momento.</p>}
    </form>;
}
