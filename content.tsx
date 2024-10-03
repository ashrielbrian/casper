import React, { useEffect, useState } from "react"
import { PGliteWorker } from 'dist/electric-sql/worker/index.js'


const extractHtmlBody = () => {
    return document.body.outerHTML;
}
const PlasmoOverlay = () => {

    const [worker, setWorker] = useState<PGliteWorker>(null);

    useEffect(() => {
        const initWorker = async () => {
            const newWorker = new PGliteWorker(
                new Worker(new URL("./worker.js", import.meta.url), {
                    type: "module"
                })
            );

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

                CREATE TABLE IF NOT EXISTS page (
                    id SERIAL PRIMARY KEY,
                    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updatedAt TIMESTAMP DEFAULT NOW(),
                    url TEXT NOT NULL UNIQUE,
                    title TEXT
                );

                CREATE TABLE IF NOT EXISTS embedding (
                    page_id INT REFERENCES page(id) ON DELETE CASCADE,
                    order INT,
                    content TEXT NOT NULL,
                    embedding vector(384),
                    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );

            `);

            const result = await newWorker.query(`
                SELECT * FROM todo WHERE id = 1;
            `);
            console.log(result.rows);
        }

        console.log("running")
        initWorker().catch(console.error)

    }, [])



    useEffect(() => {

        if (worker) {
            const webpageBodyContent = extractHtmlBody();
            console.log("worker from within second useeffect", worker)

            // TODO: check the URL - if it exists, check if age of the URL. if older than a day, delete the old entries, chunk new and get new embs

            // TODO: is it possible to ensure there's only a single instance of transformers Pipeline, and each worker reuses the same Pipeline?
            console.log(webpageBodyContent)

            // TODO: send the web contents to the background worker; bg worker has the tranformers pipeline loaded
            chrome.runtime.sendMessage({ type: "get_html_embedding", payload: webpageBodyContent }, async (backgroundResponse) => {

                // TODO: get and parse the embedding vec, passing it to the pglite worker instance to be stored in the db
                console.log("Response from the worker", backgroundResponse);
                return true;
            })

        }
    }, [worker])

    return null;
}

export default PlasmoOverlay
