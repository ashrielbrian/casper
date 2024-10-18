import { AutoTokenizer } from "@xenova/transformers"
interface Node {
    content: string,
    tag: string,
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
                id: node.id
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

    const chunkContents = async (nodes: Node[]) => {
        // TODO: all nodes before chunking should already have an id so that it is searchable later, i.e. node.id is defined.
        const tokenizer = await AutoTokenizer.from_pretrained('Xenova/all-MiniLM-L6-v2');

        const CHUNK_SIZE = 256;
        const chunks = [];
        let curr_chunk = "";
        let curr_chunk_size = 0;
        let curr_id = null;

        for (let i = 0; i < nodes.length; i++) {
            let node = nodes[i];
            let node_length = tokenizer(node.content).input_ids.size;

            if (curr_chunk_size + node_length < CHUNK_SIZE) {
                curr_chunk += ` ${node.content}`;
                curr_chunk_size += node_length;
                curr_id = node.id
            } else {

                if (curr_chunk.length > 0) {
                    chunks.push({
                        content: curr_chunk,
                        len: curr_chunk_size,
                        id: curr_id
                    })
                }

                curr_id = node.id
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