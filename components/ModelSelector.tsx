import type React from "react";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from "./Select"

interface ModelSelectorProps {
    models: string[];
    existingModel?: string;
    className?: string;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({ models, existingModel, className }) => {
    return (
        <div className={className}>
            <Select>
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder={existingModel ? existingModel : "Models"} />
                </SelectTrigger>
                <SelectContent>
                    <SelectGroup>
                        <SelectLabel className="text-sm">Models</SelectLabel>
                        {models.map((model) => (
                            <SelectItem className="text-sm" value={model}>{model}</SelectItem>
                        ))}
                    </SelectGroup>
                </SelectContent>
            </Select>
        </div>
    )
}
