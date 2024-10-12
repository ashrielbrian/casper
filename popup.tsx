import { useEffect, useState } from "react"

import { search, type SearchResult } from "~db";
import { vector } from "~dist/electric-sql/vector";
import { PGliteWorker } from 'dist/electric-sql/worker/index.js'

import "./style.css"
import { Input } from "~components/Input";
import { Button } from "~components/Button";
import { SearchResultsTable } from "~components/SearchResults";

const sendTextChunkToBackground = async (chunk: string) => {
    return await chrome.runtime.sendMessage({ type: "get_embedding", chunk })
}

function IndexPopup() {
    const [searchResults, setSearchResults] = useState<SearchResult[]>([])
    const [textToSearch, setTextToSearch] = useState("");
    const [isSearching, setIsSearching] = useState(false);
    const [worker, setWorker] = useState<PGliteWorker>(null);

    const setupWorker = () => {
        const newWorker = new PGliteWorker(
            new Worker(new URL("./worker.js", import.meta.url), {
                type: "module"
            }), {
            extensions: { vector },
            dataDir: "idb://casper.db"
        });

        console.log("Setting worker in popup page")
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

    const searchPastPages = async () => {
        if (worker && textToSearch) {
            setIsSearching(true);
            const backgroundResponse = await sendTextChunkToBackground(textToSearch);

            const results = await search(worker, backgroundResponse.embedding, 0.3, 3);

            console.log("Results of the search:", results);

            setIsSearching(false);
            setSearchResults(results);
        }
    }



    return (
        <div className={`p-8 w-[36rem] flex flex-col space-y-2 bg-slate-100 ${searchResults && searchResults.length > 0 ? 'h-[42rem]' : 'h-40'}`}>
            <div className="space-y-1">
                {/* Header section */}
                <h4 className="font-extrabold text-xl">
                    👻 Casper
                </h4>
                <p className="font-mono text-slate-500 text-xs">Close your tabs freely - search them later.</p>
            </div>

            <hr />


            {/* This child div is positioned relative to the parent, with negative margin to make it span full-width, effectively negating its parent's padding */}
            <div className="relative -mx-8 px-8 py-4 space-x-2 flex items-center">
                {/* Input and Search button to provide text to search */}
                <Input type="text" className="flex-grow" value={textToSearch} onChange={(e) => setTextToSearch(e.target.value)} placeholder="Remind me what websites I've visited.." />
                <Button onClick={searchPastPages} disabled={!textToSearch || isSearching}> Search</Button>
            </div>

            <hr />

            {searchResults && searchResults.length > 0 ?
                <SearchResultsTable results={searchResults}></SearchResultsTable> : <></>

            }

        </div>
    )
}

export default IndexPopup
