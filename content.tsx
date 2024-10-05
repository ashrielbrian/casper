import React, { useEffect, useState } from "react"
import { PGliteWorker } from 'dist/electric-sql/worker/index.js'
import { vector } from "~dist/electric-sql/vector";
import { raw, sql } from "~dist/electric-sql/templating";

const extractHtmlBody = () => {
    return document.body.outerHTML;
}

const urlIsPresentOrInDatetimeRange = async (worker: PGliteWorker, url: string, withinDays: number = 3) => {
    // fetch from db whether url exists and/or is within the required days
    let res = await worker.query("SELECT id, createdAt FROM page WHERE url = $1", [url])

    if (res.rows.length > 0) {
        console.log(`url exist ${url} of rows: ${res.rows}`)
        return true;

    } else {
        let out = await worker.query("INSERT INTO page (url, title) VALUES ($1, $2)", [url, "test"]);
        console.log("Inserted into pages", out.affectedRows)
    }
    return false;
}

const PlasmoOverlay = () => {

    const [worker, setWorker] = useState<PGliteWorker>(null);

    useEffect(() => {
        const initWorker = async () => {
            const newWorker = new PGliteWorker(
                new Worker(new URL("./worker.js", import.meta.url), {
                    type: "module"
                }), {
                extensions: { vector }
            });

            console.log("worker waiting to be ready")
            await newWorker.waitReady;
            setWorker(newWorker);  // Set the worker in state
            console.log("worker:", worker)

            // CREATE TABLE IF NOT EXISTS todo (
            //     id SERIAL PRIMARY KEY,
            //     task TEXT,
            //     done BOOLEAN DEFAULT false
            // );
            // INSERT INTO todo (task, done) VALUES ('Install PGlite from NPM', true);
            // INSERT INTO todo (task, done) VALUES ('Load PGlite', true);
            // INSERT INTO todo (task, done) VALUES ('Create a table', true);
            // INSERT INTO todo (task) VALUES ('Update a task');

            // Database operations
            await newWorker.exec(`
                CREATE EXTENSION IF NOT EXISTS vector;

                CREATE TABLE IF NOT EXISTS page(
                    id SERIAL PRIMARY KEY,
                    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updatedAt TIMESTAMP DEFAULT NOW(),
                    url TEXT NOT NULL UNIQUE,
                    title TEXT
                    );
                    
                    CREATE TABLE IF NOT EXISTS embedding(
                        id SERIAL PRIMARY KEY,
                    page_id INT REFERENCES page(id) ON DELETE CASCADE,
                    content TEXT NOT NULL,
                    embedding vector(384),
                    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
        `);

            // const result = await newWorker.query(`
            //     SELECT * FROM todo WHERE id = 1;
            // `);
            // console.log(result.rows);
        }

        initWorker().catch(console.error)
    }, [])



    useEffect(() => {
        if (worker) {
            const webpageBodyContent = extractHtmlBody();
            console.log("worker from within second useeffect", worker)


            const processPage = async () => {
                // check the URL - if it exists, check if age of the URL. if older than a day, delete the old entries, chunk new and get new embs
                // if (!await urlIsPresentOrInDatetimeRange(worker, location.href)) {
                if (true) {

                    // grab only the headers and paragraphs from the webpage
                    const { headers, paragraphs } = extractHeadersAndParagraphs(webpageBodyContent);
                    const urlId = await getUrlId(worker, location.href);

                    for (let textChunk of [...headers, ...paragraphs]) {
                        // send the web contents to the background worker; bg worker has the tranformers pipeline loaded
                        // chrome.runtime.sendMessage({ type: "get_html_embedding", payload: textChunk }, async (backgroundResponse) => {
                        //     console.log("Response from the worker", backgroundResponse);

                        //     // get and parse the embedding vec, passing it to the pglite worker instance to be stored in the db
                        //     await storeEmbeddings(worker, location.href, backgroundResponse.chunk, backgroundResponse.embedding);

                        //     return true;
                        // })

                        let backgroundResponse = await sendTextChunkToBackground(textChunk);
                        await storeEmbeddings(worker, urlId, backgroundResponse.chunk, backgroundResponse.embedding);
                    }
                }
            }
            processPage().catch(console.error)

        }
    }, [worker])

    return null;
}

const sendTextChunkToBackground = async (textChunk: string) => {
    return await chrome.runtime.sendMessage({ type: "get_html_embedding", payload: textChunk })
}
const zip = <T, U>(a: T[], b: U[]): [number, T, U][] => a.map((ele, idx) => [idx, ele, b[idx]])
// const sendTextChunkToBackgroundProm = (textChunk: string) => {
//     return new Promise((resolve, reject) => {
//         chrome.runtime.sendMessage({ type: "get_html_embedding", payload: textChunk }, (response) => {
//             if (chrome.runtime.lastError) {
//                 return reject(chrome.runtime.lastError);
//             }
//             resolve(response)
//         })
//     })
// }

const extractHeadersAndParagraphs = (htmlContent: string) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');

    const headers = doc.querySelectorAll('h1, h2, h3, h4, h5, h6');
    const paragraphs = doc.querySelectorAll('p');

    // Extract the text content of the headers and paragraphs
    const headerTexts = Array.from(headers).map(header => header.textContent.trim());
    const paragraphTexts = Array.from(paragraphs).map(paragraph => paragraph.textContent.trim());

    return {
        headers: headerTexts,
        paragraphs: paragraphTexts
    };
}

const getUrlId = async (worker: PGliteWorker, url: string) => {
    let res = await worker.query(`SELECT id FROM page WHERE url = $1`, [url]);
    console.log("URL ID: ", res.rows[0]);
    return res.rows.length > 0 ? res.rows[0].id : null
}

const storeEmbeddings = async (worker: PGliteWorker, urlId: string, chunk: string, embedding: number[]) => {

    let embStr = `'[${embedding}]'`
    const insertRes = await worker.query(`INSERT INTO embedding (page_id, content, embedding) VALUES ($1, $2, ${embStr});`,
        [urlId, chunk]
    );

    console.log("Inserted embedding", insertRes)
}

export default PlasmoOverlay
