
import { PGlite } from "~dist/electric-sql";
import { PGliteWorker } from 'dist/electric-sql/worker/index.js'
import { vector } from '~dist/electric-sql/vector';

// TODO: fix the content revalidation
// TODO: accept "" to get keyword search instead of semantic search

export interface SearchResult {
    id: number
    content: string,
    url: string,
    page_id: number,
    chunk_tag_id: string,
    prob: number
}

const DB_STORAGE = "idb://casper"
let dbInstance;

export async function getDB() {
    if (dbInstance) {
        console.log("Pglite instance exists. Reusing the instance...")
        return dbInstance;
    }

    console.log("Attempting to create pglite db")
    dbInstance = await PGlite.create(DB_STORAGE, {
        extensions: {
            vector,
        },
    })

    await initSchema(dbInstance);

    return dbInstance;
}

export const initSchema = async (db: PGlite) => {
    return await db.exec(`
        --DROP TABLE IF EXISTS embedding;
        --DROP TABLE IF EXISTS page;

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
            chunk_tag_id TEXT,
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS filters(
            url TEXT NOT NULL,
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS page_created_at_index
        ON page(createdAt);

        CREATE INDEX ON embedding USING hnsw (embedding vector_ip_ops);
        
        CREATE INDEX IF NOT EXISTS filters_url_index
        ON filters(url);

        INSERT INTO filters (url)
        VALUES ('youtube.com'), ('facebook.com'), ('google.com'), ('x.com')
        ON CONFLICT DO NOTHING;

    `)
}

export const search = async (db: PGliteWorker, embedding: number[], matchThreshold = 0.8, limit = 5): Promise<SearchResult[]> => {
    const res = await db.query(`
        SELECT embedding.id, content, page_id, page.url as url, embedding.embedding <#> $1 AS prob, embedding.chunk_tag_id
        FROM embedding

        -- the inner product is negative, so we negate matchThreshold
        LEFT JOIN page 
        ON page.id = embedding.page_id
        WHERE embedding.embedding <#> $1 < $2
        ORDER BY prob
        LIMIT $3
        `,
        [JSON.stringify(embedding), Number(matchThreshold), Number(limit)]
    );

    return res.rows.map((row: any) => ({
        id: row.id,
        content: row.content,
        page_id: row.page_id,
        url: row.url,
        prob: row.prob,
        chunk_tag_id: row.chunk_tag_id
    }));
}

export const deletePagesOlderThan = async (db: PGliteWorker, numDays: number = 14) => {

    const res = await db.query(`
        DELETE FROM page
        WHERE page.createdAt < NOW() - INTERVAL '${numDays} days'
        RETURNING *;
    `)

    console.log(`Ran delete: ${res.affectedRows} rows were affected.`)
    return res.affectedRows;
}

export const saveFilterSites = async (db: PGliteWorker, listOfSites: string[]) => {
    await db.transaction(async (tx) => {
        // not performant, but this will have to do for now.
        listOfSites.forEach(async (siteUrl) => {
            await tx.query('INSERT INTO filters(url) VALUES($1)', [siteUrl])
        });
    })
}
export const removeFilterSites = async (db: PGliteWorker, listOfSites: string[]) => {
    await db.transaction(async (tx) => {
        // not performant, but this will have to do for now.
        listOfSites.forEach(async (siteUrl) => {
            await tx.query('DELETE FROM filters WHERE url = $1', [siteUrl])
        });
    })
}

export const getFilterSites = async (db: PGliteWorker) => {
    const res = await db.query("SELECT url FROM filters");
    return res.rows.map((m) => m.url);
}

export const nukeDb = async (db: PGliteWorker) => {
    console.log("Nuking database. Bye bye.")
    const res = await db.query("DELETE FROM page")
    console.log("URLs deleted: ", res.affectedRows);
}

export const saveModelType = async (db: PGliteWorker, modelType: string) => { }