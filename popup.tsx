import { useEffect, useState } from "react"

import { type SearchResult } from "~db";
import { vector } from "~dist/electric-sql/vector";
import { PGliteWorker } from 'dist/electric-sql/worker/index.js'

import "./style.css"

import { Separator } from "~components/Separator";

import { Settings } from "~/components/Settings"
import { Search } from "~/components/Search"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~components/Tabs";


function IndexPopup() {
    const [searchResults, setSearchResults] = useState<SearchResult[]>([])
    const [worker, setWorker] = useState<PGliteWorker>(null);

    const setupWorker = () => {
        const newWorker = new PGliteWorker(
            new Worker(new URL("./worker.js", import.meta.url), {
                type: "module"
            }), {
            extensions: { vector },
            dataDir: "idb://casper.db"
        });
        setWorker(newWorker);
    }

    const setupBackgroundTabClickListener = () => {
        const handleLinkClick = (evt: MouseEvent) => {
            const a = (evt.target as HTMLElement).closest('a[href]');
            if (a) {
                evt.preventDefault(); // Prevent default navigation
                const href = (a as HTMLAnchorElement).href;

                // Open the link in a new inactive tab
                chrome.tabs.create({ url: href, active: false });
            }
        };

        // Attach event listener
        document.addEventListener('click', handleLinkClick);
        return () => document.removeEventListener('click', handleLinkClick);
    }

    useEffect(() => {
        setupWorker()
        return setupBackgroundTabClickListener()
    }, [])

    return (
        <div className={`p-8 w-[40rem] flex flex-col space-y-2 bg-slate-100 ${searchResults && searchResults.length > 0 ? 'h-[42rem]' : 'h-64'}`}>
            <div className="space-y-1">
                {/* Header section */}
                <h4 className="font-extrabold text-xl font-mono">
                    👻 Casper
                </h4>
                <div className="flex items-end">
                    <p className="inline-block grow font-mono text-slate-500 text-xs">Close your tabs freely - search them later.</p>
                </div>
            </div>

            <Separator />

            <div className="flex items-center justify-center w-full">

                <Tabs defaultValue="search" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="search" className="font-bold">Search</TabsTrigger>
                        <TabsTrigger value="settings" className="font-bold">Settings</TabsTrigger>
                    </TabsList>
                    <TabsContent value="search">
                        <Search worker={worker} searchResults={searchResults} setSearchResults={setSearchResults} />
                    </TabsContent>
                    <TabsContent value="settings">
                        <Settings />
                    </TabsContent>
                </Tabs>
            </div>

        </div>
    )
}

export default IndexPopup
