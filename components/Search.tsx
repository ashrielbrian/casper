import { Input } from "~components/Input";
import { Button } from "~components/Button";
import { SearchResultsTable } from "~components/SearchResults";
import { useEffect, useState } from "react";
import type { PGliteWorker } from "~dist/electric-sql/worker";
import { deleteStoreCache, getResultsCache, search, storeSearchCache, type SearchResult } from "~db";
import { Card } from "./Card";
import { Trash } from "lucide-react";

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
            setIsSearching(false);
            setSearchResults(results);
        }
    }

    useEffect(() => {
        const getCache = async () => {
            const searchResults = await getResultsCache(worker);
            console.log(searchResults)
            if (searchResults && searchResults.length > 0) {
                setSearchResults(searchResults);
            }
        }

        if (worker) {
            getCache().catch(console.error);
        }
    }, [worker])

    useEffect(() => {
        if (searchResults && searchResults.length > 0) {
            const cacheResults = async () => {
                await storeSearchCache(
                    worker,
                    searchResults.map(res => res.id),
                    searchResults.map(res => res.prob),
                    textToSearch
                );
            }

            cacheResults().catch(console.error)
        }
    }, [searchResults])

    const clearSearchResults = async () => {
        await deleteStoreCache(worker)
        setSearchResults([])
    }

    return (
        // TODO: Add "No search results..."
        // TODO: add cache of search results
        <Card className="p-4">
            {/* This child div is positioned relative to the parent, with negative margin to make it span full-width, effectively negating its parent's padding */}
            <div className="relative -mx-8 px-8 py-4 space-x-2 flex items-center">
                {/* Input and Search button to provide text to search */}
                <Input type="text" className="flex-grow" value={textToSearch} onChange={(e) => setTextToSearch(e.target.value)} placeholder="Remind me what websites I've visited.." />
                <Button onClick={searchPastPages} disabled={!textToSearch || isSearching}> Search</Button>
            </div>

            {searchResults && searchResults.length > 0 ?
                <div className="space-y-2">
                    <SearchResultsTable results={searchResults}></SearchResultsTable>
                    <div className="flex flex-row-reverse">
                        <Button variant="outline" size="icon" className="font-semibold" onClick={clearSearchResults}>
                            <Trash size={16} />
                        </Button>
                    </div>
                </div>
                : <></>
            }


        </Card>
    )
}