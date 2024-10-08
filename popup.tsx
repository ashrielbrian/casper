import { useEffect, useState } from "react"

import { search, type SearchResult } from "~db";
import { vector } from "~dist/electric-sql/vector";
import { PGliteWorker } from 'dist/electric-sql/worker/index.js'
import { sendTextChunkToBackground } from "~content";


function IndexPopup() {
  const [data, setData] = useState<SearchResult[]>([])
  const [textToSearch, setTextToSearch] = useState("");
  const [worker, setWorker] = useState<PGliteWorker>(null);

  useEffect(() => {
    const newWorker = new PGliteWorker(
      new Worker(new URL("./worker.js", import.meta.url), {
        type: "module"
      }), {
      extensions: { vector }
    });

    console.log("Setting worker in popup page")
    setWorker(newWorker);
    console.log(worker)
  }, [])

  const searchPastPages = async () => {
    console.log(worker, textToSearch)
    if (worker && textToSearch) {

      const backgroundResponse = await sendTextChunkToBackground(textToSearch);
      const results = await search(worker, backgroundResponse.embedding, 0.8, 3);

      console.log("Results of the search:", results);

      setData(results);

    }
  }


  return (
    <div
      style={{
        padding: 16
      }}>
      <h2>
        Welcome to your{" "}
        <a href="https://www.plasmo.com" target="_blank">
          Plasmo
        </a>{" "}
        Extension!
      </h2>

      {/* Input and Search button to provide text to search */}
      <input type="text" name="search" id="search" value={textToSearch} onChange={(e) => setTextToSearch(e.target.value)} placeholder="Enter text to search" />
      <button onClick={searchPastPages} disabled={!textToSearch}>Search</button>


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
