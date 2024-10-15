import React, { useEffect, useState } from "react"
import { Button } from "./Button"
import { Card } from "./Card"
import { type PGliteWorker } from "~dist/electric-sql/worker";
import { removeFilterSites, saveFilterSites, saveModelType, getFilterSites, nukeDb } from "~db";
import { Label } from "./Label"
import { ModelSelector } from "./ModelSelector"
import { SelectTagInput } from "./TagInputs"
import { DeleteDialogButton } from "./DeleteDialogButton";

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
    const [componentSetup, setComponentSetup] = useState(false);
    const [originalSitesToFilter, setOriginalSitesToFilter] = useState([])
    const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);

    useEffect(() => {

        if (pg) {
            const getExistingFilterSites = async () => {
                const filterSites = await getFilterSites(pg);
                setOriginalSitesToFilter(filterSites);

                if (sitesToFilter.length == 0) {
                    setSitesToFilter([...filterSites])
                }
            }

            getExistingFilterSites().catch(console.error);
            setComponentSetup(true);
        }
    }, []);

    const updateSites = async () => {
        const { addedSites, removedSites } = getDifferenceBetweenOldAndNew(originalSitesToFilter, sitesToFilter);

        if (removedSites.size > 0) {
            await removeFilterSites(pg, Array.from(removedSites));
        }

        if (addedSites.size > 0) {
            await saveFilterSites(pg, Array.from(addedSites));
        }

        setOriginalSitesToFilter([...sitesToFilter]);
        setSitesToFilter([...sitesToFilter])
    }

    const getDifferenceBetweenOldAndNew = (oldArr: string[], newArr: string[]) => {
        const oriSites = new Set(oldArr);
        const newSites = new Set(newArr);

        return {
            addedSites: newSites.difference(oriSites),
            removedSites: oriSites.difference(newSites)
        }
    }

    const onSettingsSave = async () => {

        // TODO:
        // saveModelType(pg, "")
        setHasChanged(false);
        await updateSites()
    }

    useEffect(() => {
        // check if the sites have been updated and changed
        // we also need to wait for the component to setup as the initial useEffect populates the originalSitesToFilter, otherwise
        // this if statement executes before the originalSitesToFilter has been populated
        if (!hasChanged && componentSetup) {
            console.log("sites to filter has changed. updating..")
            console.log("ori sites", originalSitesToFilter)
            console.log("new sites", sitesToFilter)
            const { addedSites, removedSites } = getDifferenceBetweenOldAndNew(originalSitesToFilter, sitesToFilter);
            if (addedSites.size > 0 || removedSites.size > 0) {
                setHasChanged(true);
            }
        }
    }, [sitesToFilter])

    const deleteDb = async () => {
        if (pg) {
            await nukeDb(pg);
            setShowDeleteConfirmation(true);
        }
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
                    <DeleteDialogButton onConfirm={deleteDb}></DeleteDialogButton>
                    {/* <Button className="flex-0 font-extrabold" variant="destructive">Clear Database</Button> */}
                </div>
                <div className="flex">
                    <div className="w-1/3"></div>
                    {showDeleteConfirmation ? <p className="text-red-400">Database cleared!</p> : <></>}
                </div>
            </div>

            <div id="footer" className="flex flex-row-reverse">
                <Button onClick={onSettingsSave} disabled={!hasChanged}>Save</Button>
            </div>
        </Card>
    )
}