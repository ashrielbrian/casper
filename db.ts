
import { PGlite } from "~dist/electric-sql";
import { PGliteWorker } from 'dist/electric-sql/worker/index.js'
import { vector } from '~dist/electric-sql/vector';

// TODO: add a deletion expiry

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

        create index on embedding using hnsw (embedding vector_ip_ops);
    `)
}
export interface SearchResult {
    id: number
    content: string,
    page_id: number,
    prob: number
}

export const search = async (db: PGliteWorker, embedding: number[], matchThreshold = 0.8, limit = 3): Promise<SearchResult[]> => {
    const res = await db.query(`
        select id, content, page_id, embedding.embedding <#> $1 as prob from embedding

        -- the inner product is negative, so we negate matchThreshold
        where embedding.embedding <#> $1 < $2

        order by embedding.embedding <#> $1
        limit $3
        `,
        [JSON.stringify(embedding), Number(matchThreshold), Number(limit)]
    );

    return res.rows.map((row: any) => ({
        id: row.id,
        content: row.content,
        page_id: row.page_id,
        prob: row.prob
    }));
}