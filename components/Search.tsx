import { Input } from "~components/Input";
import { Button } from "~components/Button";
import { SearchResultsTable } from "~components/SearchResults";
import { useEffect, useState } from "react";
import type { PGliteWorker } from "~dist/electric-sql/worker";
import { deleteStoreCache, getSearchResultsCache, search, storeSearchCache, type SearchResult } from "~db";
import { Card } from "./Card";
import { Trash } from "lucide-react";
import { Spinner } from "./Spinner";

interface SearchProps {
    worker: PGliteWorker;
    searchResults: SearchResult[];
    setSearchResults: React.Dispatch<React.SetStateAction<SearchResult[]>>;
}

export const Search: React.FC<SearchProps> = ({ worker, searchResults, setSearchResults }) => {
    const [isSearching, setIsSearching] = useState(false);
    const [noSearchResults, setNoSearchResults] = useState(false);
    const [textToSearch, setTextToSearch] = useState("");
    const [prevSearchedText, setPrevSearchText] = useState("");

    const sendTextChunkToBackground = async (chunk: string) => {
        return await chrome.runtime.sendMessage({ type: "get_embedding", chunk })
    }

    const searchPastPages = async () => {
        if (worker && textToSearch) {
            setIsSearching(true);
            setPrevSearchText("");
            const backgroundResponse = await sendTextChunkToBackground(textToSearch);
            const results = await search(worker, backgroundResponse.embedding, 0.3, 5);

            if (results.length === 0) {
                setNoSearchResults(true);
            } else {
                setNoSearchResults(false);
                setSearchResults(results);
            }
            setIsSearching(false);
        }
    }

    useEffect(() => {
        const getCache = async () => {
            const { cache, searchText } = await getSearchResultsCache(worker);
            console.log("cache", cache)
            console.log("searchText", searchText)
            if (cache && cache.length > 0) {
                setSearchResults(cache);
                setPrevSearchText(searchText);
            }
        }

        if (worker) {
            getCache().catch(console.error);
        }
    }, [worker])

    useEffect(() => {
        console.log("SEARCH RESULTS CHANGED!", searchResults)
        if (searchResults && searchResults.length > 0 && textToSearch) {
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
        setPrevSearchText("")
        setSearchResults([])
        await deleteStoreCache(worker)
    }

    return (
        // TODO: Animate the deletion and closing of the table
        <Card className="p-4">
            {/* This child div is positioned relative to the parent, with negative margin to make it span full-width, effectively negating its parent's padding */}
            <div className="relative -mx-8 px-8 py-4 space-x-2 flex items-center">
                {/* Input and Search button to provide text to search */}
                <Input type="text" className="flex-grow" value={textToSearch} onChange={(e) => setTextToSearch(e.target.value)} placeholder="Remind me what websites I've visited.." />
                <Button onClick={searchPastPages} disabled={!textToSearch || isSearching}> Search</Button>
            </div>

            {
                isSearching && (
                    <Spinner />
                )
            }

            {
                noSearchResults && (
                    <div>
                        <p className="text-slate-500">No results found..</p>
                    </div>
                )
            }

            {searchResults && searchResults.length > 0 ?
                <div className="space-y-2">
                    {prevSearchedText && (
                        <div className="p-2">
                            <p className="text-slate-500 text-xs">Search results for `{prevSearchedText}`</p>
                        </div>
                    )}
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