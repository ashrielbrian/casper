import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}


export const zip = <T, U>(a: T[], b: U[]): [number, T, U][] => {
    const len = Math.min(a.length, b.length);
    return a.slice(0, len).map((ele, idx) => [idx, ele, b[idx]]);
}

export const extractDomain = (url: string): string => {
    try {
        const parsedUrl = new URL(url);
        let domain = parsedUrl.hostname;
        if (domain.startsWith('www.')) {
            domain = domain.slice(4);
        }
        return domain;
    } catch {
        return url ?? "";
    }
}
