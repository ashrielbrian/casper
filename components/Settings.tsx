import { Button } from "./Button"
import { Label } from "./Label"
import { ModelSelector } from "./ModelSelector"

const AVAILABLE_MODELS = [
    "Supabase/gte-small",
    "Supabase/gte-large",
    'Xenova/all-MiniLM-L6-v2'
]

export const Settings = () => {
    return (
        <div className="flex-col space-y-4 justify-center">
            <div className="flex items-center">
                <Label className="w-1/3 pr-4 font-bold text-right">Embedding Model:</Label>
                <ModelSelector models={AVAILABLE_MODELS} />
            </div>
            <div className="flex items-center">
                <div className="w-1/3"></div>
                <Button className="flex-0" variant="destructive">Clear Database</Button>
            </div>
        </div>
    )
}