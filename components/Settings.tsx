import React, { useState } from "react"
import { Button } from "./Button"
import { Card } from "./Card"
import { type PGliteWorker } from "~dist/electric-sql/worker";
import { saveFilterSites, saveModelType } from "~db";
import { Label } from "./Label"
import { ModelSelector } from "./ModelSelector"
import { SelectTagInput } from "./TagInputs"

const AVAILABLE_MODELS = [
    "Supabase/gte-small",
    "Supabase/gte-large",
    'Xenova/all-MiniLM-L6-v2'
]

interface SettingsProps {
    pg: PGliteWorker;
    sitesToFilter: string[]
    setSitesToFilter: React.Dispatch<React.SetStateAction<string[]>>;
    hasChanged: boolean
    setHasChanged: React.Dispatch<React.SetStateAction<boolean>>;
}

export const Settings: React.FC<SettingsProps> = ({ pg, sitesToFilter, setSitesToFilter, hasChanged, setHasChanged }) => {

    // const [sitesToFilter, setSitesToFilter] = useState([])
    const onSettingsSave = () => {
        // TODO: save to db

        saveModelType(pg, "")
        saveFilterSites(pg, sitesToFilter);
        setHasChanged(false);
    }
    return (
        <Card className="p-4">
            <div className="flex-col space-y-4 justify-center">
                <div className="flex items-center">
                    <Label className="w-1/3 pr-4 font-bold text-right">Embedding Model:</Label>
                    <ModelSelector models={AVAILABLE_MODELS} />
                </div>
                <div className="flex items-center">
                    <Label className="w-1/3 pr-4 font-bold text-right">Filter List</Label>
                    {/* <Input className="flex-1"></Input> */}
                    <SelectTagInput
                        className="flex-1"
                        value={sitesToFilter}
                        options={[
                            { label: 'youtube.com', value: 'youtube.com' },
                            { label: 'google.com', value: 'google.com' },
                            { label: 'facebook.com', value: 'facebook.com' },
                            { label: 'x.com', value: 'x.com' },
                        ]}
                        onChange={setSitesToFilter}
                    />
                </div>
                <div className="flex items-center">
                    <div className="w-1/3"></div>
                    <Button className="flex-0 font-extrabold" variant="destructive">Clear Database</Button>
                </div>
            </div>

            <div id="footer" className="flex flex-row-reverse">
                <Button onClick={onSettingsSave} disabled={hasChanged}>Save</Button>
            </div>
        </Card>
    )
}