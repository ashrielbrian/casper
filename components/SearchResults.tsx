import { extractDomain } from "~lib/utils"
import { Table, TableCaption, TableHeader, TableRow, TableHead, TableCell, TableBody } from "./Table"
import { type SearchResult } from "~db"

export const SearchResultsTable = ({ results }: { results: SearchResult[] }) => {

    return (
        <Table>
            <TableCaption>Websites you've visited</TableCaption>
            <TableHeader className="font-light">
                <TableRow>
                    <TableHead className="w-[100px]">Link</TableHead>
                    <TableHead>Content</TableHead>
                    <TableHead>Similarity</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {results.map((res) => (
                    <TableRow key={res.id}>
                        <TableCell className="font-bold">
                            <a href={res.url} className="link-underline-animation">
                                {extractDomain(res.url)}
                            </a>
                        </TableCell>
                        <TableCell className="text-sm">
                            <a href={`${res.url}#${res.chunk_tag_id}`} className="link-underline-animation">
                                {res.content.slice(0, 100) + "..."}

                            </a>
                        </TableCell>
                        <TableCell className="text-right">{res.prob.toFixed(2)}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    )
}