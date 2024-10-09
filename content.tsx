import React, { useEffect, useState } from "react"

const extractHtmlBody = () => {
    return document.body.outerHTML;
}

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

const PlasmoOverlay = () => {

    // const [worker, setWorker] = useState<PGliteWorker>(null);

    // useEffect(() => {
    //     const initWorker = async () => {
    //         const newWorker = new PGliteWorker(
    //             new Worker(new URL("./worker.js", import.meta.url), {
    //                 type: "module"
    //             }), {
    //             extensions: { vector }
    //         });

    //         console.log("worker waiting to be ready")
    //         await newWorker.waitReady;
    //         setWorker(newWorker);  // Set the worker in state
    //         console.log("worker:", worker)

    //         // CREATE TABLE IF NOT EXISTS todo (
    //         //     id SERIAL PRIMARY KEY,
    //         //     task TEXT,
    //         //     done BOOLEAN DEFAULT false
    //         // );
    //         // INSERT INTO todo (task, done) VALUES ('Install PGlite from NPM', true);
    //         // INSERT INTO todo (task, done) VALUES ('Load PGlite', true);
    //         // INSERT INTO todo (task, done) VALUES ('Create a table', true);
    //         // INSERT INTO todo (task) VALUES ('Update a task');

    //         // Database operations
    //         await newWorker.exec(`
    //             CREATE EXTENSION IF NOT EXISTS vector;

    //             CREATE TABLE IF NOT EXISTS page(
    //                 id SERIAL PRIMARY KEY,
    //                 createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    //                 updatedAt TIMESTAMP DEFAULT NOW(),
    //                 url TEXT NOT NULL UNIQUE,
    //                 title TEXT
    //                 );

    //                 CREATE TABLE IF NOT EXISTS embedding(
    //                     id SERIAL PRIMARY KEY,
    //                 page_id INT REFERENCES page(id) ON DELETE CASCADE,
    //                 content TEXT NOT NULL,
    //                 embedding vector(384),
    //                 createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    //             );
    //     `);

    //         // const result = await newWorker.query(`
    //         //     SELECT * FROM todo WHERE id = 1;
    //         // `);
    //         // console.log(result.rows);
    //     }

    //     initWorker().catch(console.error)
    // }, [])



    useEffect(() => {

        // grab only the headers and paragraphs from the webpage
        const webpageBodyContent = extractHtmlBody();
        const { headers, paragraphs } = extractHeadersAndParagraphs(webpageBodyContent);

        const processPage = async () => {

            const backgroundResponse = await processPageInBackground(location.href, [...headers, ...paragraphs])

            console.log("Page has been processed. Background response: ", backgroundResponse)
        }
        processPage().catch(console.error)

    }, [])

    return null;
}

export const processPageInBackground = async (url: string, webHeadersAndParas: string[]) => {
    return await chrome.runtime.sendMessage({ type: "process_page", url, textChunks: webHeadersAndParas })
}

const zip = <T, U>(a: T[], b: U[]): [number, T, U][] => a.map((ele, idx) => [idx, ele, b[idx]])


export default PlasmoOverlay
