import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from "./Select"

export const ModelSelector = ({ models, existingModel }: { models: string[], existingModel?: string }) => {
    return (
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
    )
}
