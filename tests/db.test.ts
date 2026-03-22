
import { expect } from 'chai';

import { PGlite } from "~dist/electric-sql";
import { vector } from '~dist/electric-sql/vector';
import * as db from '~db';
import type { Chunk } from "~lib/chunk";

describe('PGLite Database Tests', () => {
    let testDb;

    beforeEach(async () => {
        // Create a new in-memory database for each test
        testDb = await PGlite.create(':memory:', {
            extensions: { vector },
        });
        await db.initSchema(testDb);
    });

    afterEach(async () => {
        await testDb.query('DELETE FROM page');
        await testDb.close();
    });

    describe('Database Initialization', () => {
        it('should initialize schema successfully', async () => {
            const tables = await testDb.query(`
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'public';
            `);
            expect(tables.rows).to.have.lengthOf(5);
        });

        it('should be idempotent (calling initSchema twice should not throw)', async () => {
            await db.initSchema(testDb);
            const count = await db.countRows(testDb, "page");
            expect(count).to.equal(0);
        });

        it('should create default filters', async () => {
            const filters = await db.getFilterSites(testDb);
            expect(filters).to.include('facebook.com');
            expect(filters).to.include('google.com');
            expect(filters).to.include('x.com');
            expect(filters).to.include('youtube.com');
        });
    });

    describe('URL Management', () => {
        it('should check if URL exists', async () => {
            const url = 'https://example.com';
            const exists = await db.urlIsPresentOrInDatetimeRange({
                db: testDb,
                url,
                withinDays: 3
            });
            expect(exists).to.be.false;
        });

        it('should get URL ID after insertion', async () => {
            const url = 'https://geturlid.com';
            await testDb.query("INSERT INTO page (url, title) VALUES ($1, $2)", [url, "test"]);
            const urlId = await db.getUrlId({ db: testDb, url });
            expect(urlId).to.be.a('number');
        });
    });

    describe('Embedding Operations', () => {
        it('should store and retrieve embeddings', async () => {
            const url = 'https://example.com';
            const pageRes = await testDb.query(
                "INSERT INTO page (url, title) VALUES ($1, $2) RETURNING id",
                [url, "test"]
            );
            const urlId = pageRes.rows[0].id;

            const chunk: Chunk = {
                id: "23",
                content: "Test content",
                len: 10
            };
            const embedding = Array(384).fill(0.1);

            await db.storeEmbeddings(testDb, urlId, chunk, embedding);

            const searchResults = await db.search(testDb, embedding, 0.8, 1);
            expect(searchResults).to.have.lengthOf(1);
            expect(searchResults[0].content).to.equal("Test content");
        });
    });

    describe('Filter Management', () => {
        it('should save and remove filter sites', async () => {
            const newSites = ['test1.com', 'test2.com'];
            await db.saveFilterSites(testDb, newSites);

            let filters = await db.getFilterSites(testDb);
            expect(filters).to.include('test1.com');

            await db.removeFilterSites(testDb, ['test1.com']);
            filters = await db.getFilterSites(testDb);
            expect(filters).to.not.include('test1.com');
        });
    });

    describe('nukeDb', () => {
        it('should clear page, embedding, and cache but preserve filters', async () => {
            const url = 'https://example.com';
            const pageRes = await testDb.query(
                "INSERT INTO page (url, title) VALUES ($1, $2) RETURNING id",
                [url, "test"]
            );
            const urlId = pageRes.rows[0].id;

            const chunk: Chunk = { id: "1", content: "Test content", len: 10 };
            const embedding = Array(384).fill(0.1);
            await db.storeEmbeddings(testDb, urlId, chunk, embedding);

            const searchResults = await db.search(testDb, embedding, 0.8, 1);
            await db.storeSearchCache(testDb, [searchResults[0].id], [0.95], "test");

            await db.saveFilterSites(testDb, ['custom.com']);

            await db.nukeDb(testDb);

            expect(await db.countRows(testDb, "page")).to.equal(0);
            expect(await db.countRows(testDb, "embedding")).to.equal(0);

            const cache = await db.getSearchResultsCache(testDb);
            expect(cache.cache).to.have.lengthOf(0);

            const filters = await db.getFilterSites(testDb);
            expect(filters).to.include('custom.com');
            expect(filters).to.include('google.com');
        });
    });

    describe('Search Cache', () => {
        it('should store and retrieve search cache', async () => {
            // Setup test data
            const url = 'https://example.com';
            const pageRes = await testDb.query(
                "INSERT INTO page (url, title) VALUES ($1, $2) RETURNING id",
                [url, "test"]
            );
            const urlId = pageRes.rows[0].id;

            const embedding = Array(384).fill(0.1);
            let chunkLoad: Chunk = {
                id: "15",
                content: "Test content",
                len: 10
            }
            await db.storeEmbeddings(testDb, urlId, chunkLoad, embedding);

            const searchResults = await db.search(testDb, embedding, 0.8, 1);
            await db.storeSearchCache(
                testDb,
                [searchResults[0].id],
                [0.95],
                "test query"
            );

            const cache = await db.getSearchResultsCache(testDb);
            expect(cache.searchText).to.equal("test query");
            expect(cache.cache).to.have.lengthOf(1);
        });
    });
});
