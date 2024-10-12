import { Table, TableCaption, TableHeader, TableRow, TableHead, TableCell, TableBody } from "./Table"
import { type SearchResult } from "~db"

export const SearchResultsTable = ({ results }: { results: SearchResult[] }) => {
    const extractDomain = (url: string) => {
        // Create a URL object to parse the URL
        const parsedUrl = new URL(url);

        // Extract the hostname from the parsed URL
        let domain = parsedUrl.hostname;

        // Remove 'www.' if present
        if (domain.startsWith('www.')) {
            domain = domain.slice(4);
        }

        return domain;
    }


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
                            <a href={res.url} className="relative after:content-[''] after:absolute after:w-0 after:h-[1px] after:bg-current after:bottom-0 after:left-0 hover:after:w-full after:transition-width after:duration-300 after:ease-out">
                                {extractDomain(res.url)}
                            </a>
                        </TableCell>
                        <TableCell className="text-sm">{res.content}</TableCell>
                        <TableCell className="text-right">{res.prob.toFixed(2)}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    )
}