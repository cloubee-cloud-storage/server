import { Request } from 'express';

export const cookieExtractor = (req: Request): string | null => {
    return req?.cookies?.['access_token'] ?? null;
};
