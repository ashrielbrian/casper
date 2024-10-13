'use client';

import * as React from 'react';
import { XIcon } from 'lucide-react';
import { Badge } from '~/components/Badge'
import { Button } from '~/components/Button';
import { type InputProps } from './Input';
import { cn } from '~/lib/utils';

type Option = {
    label: string;
    value: string;
};

type SelectTagInputProps = Omit<InputProps, 'value' | 'onChange'> & {
    value: string[];
    onChange: React.Dispatch<React.SetStateAction<string[]>>;
    options: Option[];
};

const SelectTagInput = React.forwardRef<HTMLInputElement, SelectTagInputProps>(
    ({ className, value, onChange, options, ...props }, ref) => {
        const [pendingDataPoint, setPendingDataPoint] = React.useState('');
        const [isDropdownOpen, setDropdownOpen] = React.useState(false);

        const addPendingDataPoint = (newOption?: Option) => {
            if (newOption) {
                if (!value.includes(newOption.value)) {
                    onChange([...value, newOption.value]);
                }
            } else if (pendingDataPoint) {

                // allow even non-options to be added, hence commenting this out:
                // const matchedOption = options.find(
                //     (option) => option.label.toLowerCase() === pendingDataPoint.trim().toLowerCase(),
                // );
                // if (matchedOption && !value.includes(matchedOption.value)) {
                //     onChange([...value, matchedOption.value]);
                // }
                onChange([...value, pendingDataPoint.trim().toLowerCase()])
            }
            setPendingDataPoint('');
            setDropdownOpen(false);
        };

        const getLabelByValue = (val: string) => {
            const matchedOption = options.find((option) => option.value === val);

            return matchedOption ? matchedOption.label : val;
        };

        return (
            <div className={cn('relative', className)}>
                <div
                    className={cn(
                        'has-[:focus-visible]:outline-none has-[:focus-visible]:ring-1 has-[:focus-visible]:ring-neutral-950 has-[:focus-visible]:ring-offset-0 dark:has-[:focus-visible]:ring-neutral-300 min-h-10 flex w-full flex-wrap gap-2 rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm ring-offset-white  disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-800 dark:bg-neutral-950 dark:ring-offset-neutral-950',
                    )}
                >
                    {value.map((val) => (
                        <Badge key={val} variant="secondary">
                            {getLabelByValue(val)}
                            <Button
                                variant="ghost"
                                size="icon"
                                className="ml-2 h-3 w-3"
                                onClick={() => onChange(value.filter((i) => i !== val))}
                            >
                                <XIcon className="w-3" />
                            </Button>
                        </Badge>
                    ))}
                    <input
                        className={cn('flex-1 outline-none placeholder:text-neutral-500 dark:placeholder:text-neutral-400')}
                        value={pendingDataPoint}
                        onChange={(e) => {
                            setPendingDataPoint(e.target.value);
                            setDropdownOpen(true);
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ',') {
                                e.preventDefault();
                                addPendingDataPoint();
                            } else if (e.key === 'Backspace' && pendingDataPoint.length === 0 && value.length > 0) {
                                e.preventDefault();
                                onChange(value.slice(0, -1));
                            }
                        }}
                        onBlur={() => setDropdownOpen(false)}
                        {...props}
                        ref={ref}
                    />
                </div>
                {isDropdownOpen && pendingDataPoint && (
                    <ul
                        className="absolute left-0 mt-1 max-h-60 w-full overflow-auto rounded-md border border-neutral-200 bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm dark:border-neutral-800 dark:bg-neutral-950"
                        role="listbox"
                    >
                        {options.filter(
                            (option) =>
                                option.label.toLowerCase().includes(pendingDataPoint.toLowerCase()) && !value.includes(option.value),
                        ).length > 0 ? (
                            options
                                .filter(
                                    (option) =>
                                        option.label.toLowerCase().includes(pendingDataPoint.toLowerCase()) &&
                                        !value.includes(option.value),
                                )
                                .map((option) => (
                                    <li
                                        key={option.value}
                                        className="cursor-pointer select-none px-4 py-2 text-neutral-900 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
                                        onClick={() => addPendingDataPoint(option)}
                                    >
                                        {option.label}
                                    </li>
                                ))
                        ) : (
                            <li className="cursor-not-allowed select-none px-4 py-2 text-neutral-500 dark:text-neutral-400">
                                No options found
                            </li>
                        )}
                    </ul>
                )}
            </div>
        );
    },
);

SelectTagInput.displayName = 'SelectTagInput';

export { SelectTagInput };