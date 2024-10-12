import { useEffect, useState } from "react"

import { search, type SearchResult } from "~db";
import { vector } from "~dist/electric-sql/vector";
import { PGliteWorker } from 'dist/electric-sql/worker/index.js'

import "./style.css"
import { Input } from "~components/Input";
import { Button } from "~components/Button";

const sendTextChunkToBackground = async (chunk: string) => {
    return await chrome.runtime.sendMessage({ type: "get_embedding", chunk })
}

function IndexPopup() {
    const [data, setData] = useState<SearchResult[]>([])
    const [textToSearch, setTextToSearch] = useState("");
    const [worker, setWorker] = useState<PGliteWorker>(null);

    useEffect(() => {
        const newWorker = new PGliteWorker(
            new Worker(new URL("./worker.js", import.meta.url), {
                type: "module"
            }), {
            extensions: { vector },
            dataDir: "idb://casper.db"
        });

        console.log("Setting worker in popup page")
        setWorker(newWorker);
    }, [])

    const searchPastPages = async () => {
        console.log(worker, textToSearch)
        if (worker && textToSearch) {

            const backgroundResponse = await sendTextChunkToBackground(textToSearch);

            const results = await search(worker, backgroundResponse.embedding, 0.3, 3);

            console.log("Results of the search:", results);

            setData(results);

        }
    }


    return (
        <div className="p-8 w-[36rem] h-96 flex flex-col space-y-2 bg-cyan-50">
            <div className="space-y-1">
                {/* Header section */}
                <h4 className="font-extrabold text-xl">
                    👻 Casper
                </h4>
                <p className="font-mono text-slate-500 text-xs">Close your tabs freely - search them later.</p>
            </div>


            {/* This child div is positioned relative to the parent, with negative margin to make it span full-width, effectively negating its parent's padding */}
            <div className="relative -mx-8 px-8 py-4 space-x-2 flex items-center">
                {/* Input and Search button to provide text to search */}
                <Input type="text" className="flex-grow" value={textToSearch} onChange={(e) => setTextToSearch(e.target.value)} placeholder="Remind me what websites I've visited.." />
                <Button onClick={searchPastPages} disabled={!textToSearch}> Search</Button>
            </div>

            <ul>
                {data.length > 0 ? (
                    data.map((result) => (
                        <li key={result.id}>
                            <h3>Page ID: {result.page_id}</h3>
                            <p>{result.content}</p>
                            <p>Relevance: {result.prob.toFixed(3)}</p>
                        </li>
                    ))
                ) : (<></>)}
            </ul>

            {/* <a href="https://docs.plasmo.com" target="_blank">
        View Docs
      </a> */}
        </div>
    )
}

export default IndexPopup
