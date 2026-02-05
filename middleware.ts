import { getToken } from "next-auth/jwt";
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextRequest, NextResponse } from 'next/server';

// Create i18n middleware
const intlMiddleware = createMiddleware(routing);

// Valid locales
const locales = ['pt-BR', 'en', 'es'];
const defaultLocale = 'pt-BR';

// Public paths that don't require authentication
const publicPaths = [
    '/sign-in',
    '/sign-up',
    '/c',
    '/portal',
];

// Check if path is public
function isPublicPath(pathname: string): boolean {
    // Root is always public
    if (pathname === '/') return true;

    // Remove locale prefix if present
    let pathToCheck = pathname;
    for (const locale of locales) {
        if (pathname.startsWith(`/${locale}/`)) {
            pathToCheck = pathname.substring(locale.length + 1);
            break;
        } else if (pathname === `/${locale}`) {
            return true; // Locale root is public
        }
    }

    // Check if it starts with any public path
    for (const publicPath of publicPaths) {
        if (pathToCheck === publicPath || pathToCheck.startsWith(`${publicPath}/`)) {
            return true;
        }
    }

    return false;
}

function isApiRoute(pathname: string): boolean {
    return pathname.startsWith('/api');
}

// Extract locale from pathname
function getLocaleFromPath(pathname: string): string {
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length > 0 && locales.includes(segments[0])) {
        return segments[0];
    }
    return defaultLocale;
}

// Routes that require password change
const changePasswordPath = '/change-password';

export async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    // 1. Skip all API routes - they handle auth internally
    if (isApiRoute(pathname)) {
        return NextResponse.next();
    }

    // 2. For public paths, just apply i18n middleware
    if (isPublicPath(pathname)) {
        return intlMiddleware(req);
    }

    // 3. Protected routes - check authentication via JWT
    const authSecret = process.env.AUTH_SECRET;
    
    // Determine the correct cookie name based on environment
    // In production with HTTPS (behind proxy), cookies use __Secure- prefix
    const isSecure = process.env.NEXTAUTH_URL?.startsWith('https://');
    const cookieName = isSecure 
        ? '__Secure-authjs.session-token' 
        : 'authjs.session-token';
    
    const token = await getToken({ 
        req, 
        secret: authSecret,
        cookieName: cookieName,
    });

    const locale = getLocaleFromPath(pathname);

    if (!token) {
        // Not authenticated - redirect to sign-in
        const signInUrl = new URL(`/${locale}/sign-in`, req.url);
        signInUrl.searchParams.set('callbackUrl', pathname);
        return NextResponse.redirect(signInUrl);
    }

    // 4. Check if user must change password
    if (token.mustChangePassword && !pathname.includes(changePasswordPath)) {
        return NextResponse.redirect(new URL(`/${locale}/dashboard/change-password`, req.url));
    }

    // 5. Authenticated user - apply i18n middleware
    return intlMiddleware(req);
}

export const config = {
    matcher: [
        // Skip Next.js internals and static files
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    ],
};
