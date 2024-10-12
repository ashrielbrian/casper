import { Input } from "~components/Input";
import { Button } from "~components/Button";
import { SearchResultsTable } from "~components/SearchResults";
import { useState } from "react";
import { Separator } from "./Separator";
import type { PGliteWorker } from "~dist/electric-sql/worker";
import { search, type SearchResult } from "~db";

interface SearchProps {
    worker: PGliteWorker;
    searchResults: SearchResult[];
    setSearchResults: React.Dispatch<React.SetStateAction<SearchResult[]>>;
}

export const Search: React.FC<SearchProps> = ({ worker, searchResults, setSearchResults }) => {
    const [isSearching, setIsSearching] = useState(false);
    const [textToSearch, setTextToSearch] = useState("");

    const sendTextChunkToBackground = async (chunk: string) => {
        return await chrome.runtime.sendMessage({ type: "get_embedding", chunk })
    }

    const searchPastPages = async () => {
        if (worker && textToSearch) {
            setIsSearching(true);
            const backgroundResponse = await sendTextChunkToBackground(textToSearch);

            const results = await search(worker, backgroundResponse.embedding, 0.3, 5);

            console.log("Results of the search:", results);

            setIsSearching(false);
            setSearchResults(results);
        }
    }

    return (
        <>
            {/* This child div is positioned relative to the parent, with negative margin to make it span full-width, effectively negating its parent's padding */}
            <div className="relative -mx-8 px-8 py-4 space-x-2 flex items-center">
                {/* Input and Search button to provide text to search */}
                <Input type="text" className="flex-grow" value={textToSearch} onChange={(e) => setTextToSearch(e.target.value)} placeholder="Remind me what websites I've visited.." />
                <Button onClick={searchPastPages} disabled={!textToSearch || isSearching}> Search</Button>
            </div>

            <Separator />

            {searchResults && searchResults.length > 0 ?
                <SearchResultsTable results={searchResults}></SearchResultsTable> : <></>
            }
        </>
    )
}