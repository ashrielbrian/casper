import { AutoTokenizer } from "@xenova/transformers"

export interface Node {
    content: string
    tag: string
    id: string
}

export interface Chunk {
    content: string
    len: number
    id: string
}
export const parseChunkHtmlContent = async (htmlContent: string) => {

    const MIN_CHAR_LIMIT = 20;
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');

    const headerTags = ['h1', 'h2', "h3", "h4", "h5", 'h6']
    const relevantTags = [...headerTags, 'p', 'li']
    const nodes: Node[] = [];

    const traverseNode = (node: Element) => {
        if (relevantTags.includes(node.tagName.toLowerCase())) {
            nodes.push({
                content: node.textContent.trim(),
                tag: node.tagName.toLowerCase(),
                // if there is no id attached to this node, use a part of its text content
                id: node.id ? node.id : `:~:text=${encodeURIComponent(node.textContent.trim().slice(0, 100))}`
            });
        }

        if (node.hasChildNodes()) {
            for (let childNode of node.children) {
                traverseNode(childNode);
            }
        }
    }

    traverseNode(doc.body)
    const filteredNodes = nodes.filter(node => headerTags.includes(node.tag) || node.content.length > MIN_CHAR_LIMIT)
    console.log(filteredNodes)

    const chunkContents = async (nodes: Node[], tokenizerType = 'Xenova/all-MiniLM-L6-v2') => {
        const tokenizer = await AutoTokenizer.from_pretrained(tokenizerType);

        const CHUNK_SIZE = 256;
        const chunks: Chunk[] = [];
        let curr_chunk = "";
        let curr_chunk_size = 0;
        let curr_id = null;

        for (let i = 0; i < nodes.length; i++) {
            let node = nodes[i];
            let node_length = tokenizer(node.content).input_ids.size;

            if (curr_chunk_size + node_length < CHUNK_SIZE) {
                curr_chunk += ` ${node.content}`;
                curr_chunk_size += node_length;
                // TODO: uses the most recent node's id. can be improved
                curr_id = node.id ? node.id : curr_id
            } else {
                // adding the current node would exceed CHUNK_SIZE. add the existing chunk, 
                // and deal with the current node in the next iteration
                if (curr_chunk.length > 0) {
                    chunks.push({
                        content: curr_chunk,
                        len: curr_chunk_size,
                        id: curr_id
                    })
                }

                curr_id = node.id ? node.id : curr_id
                curr_chunk_size = node_length;
                curr_chunk = node.content;
            }
        }

        // push the last chunk if present
        if (curr_chunk.length > 0) {
            chunks.push({
                content: curr_chunk,
                len: curr_chunk_size,
                id: curr_id
            })
        }

        return chunks;
    }

    return await chunkContents(filteredNodes);
}