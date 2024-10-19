import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}


export const zip = <T, U>(a: T[], b: U[]): [number, T, U][] => a.map((ele, idx) => [idx, ele, b[idx]])

export const extractDomain = (url: string) => {
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