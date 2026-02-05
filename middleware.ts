import { auth } from "@/lib/auth";
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextRequest, NextResponse } from 'next/server';

// Create i18n middleware
const intlMiddleware = createMiddleware(routing);

// Valid locales
const locales = ['pt-BR', 'en', 'es'];

// Public routes (no authentication required)
const publicPatterns = [
    /^\/$/,
    /^\/[a-z]{2}(-[A-Z]{2})?$/,                    // /:locale
    /^\/[a-z]{2}(-[A-Z]{2})?\/c(\/.*)?$/,          // /:locale/c/*
    /^\/[a-z]{2}(-[A-Z]{2})?\/portal(\/.*)?$/,     // /:locale/portal/*
    /^\/[a-z]{2}(-[A-Z]{2})?\/sign-in(\/.*)?$/,    // /:locale/sign-in/*
    /^\/c(\/.*)?$/,                                 // /c/*
    /^\/portal(\/.*)?$/,                            // /portal/*
    /^\/sign-in(\/.*)?$/,                           // /sign-in/*
    /^\/api\/auth(\/.*)?$/,                         // /api/auth/* (NextAuth routes)
    /^\/api\/c(\/.*)?$/,                            // /api/c/* (public checklist API)
    /^\/api\/portal(\/.*)?$/,                       // /api/portal/* (public portal API)
    /^\/api\/database-options$/,                    // /api/database-options
    /^\/api\/integration(\/.*)?$/,                  // /api/integration/*
    /^\/api\/lookup(\/.*)?$/,                       // /api/lookup/*
];

function isPublicRoute(pathname: string): boolean {
    return publicPatterns.some(pattern => pattern.test(pathname));
}

function isApiRoute(pathname: string): boolean {
    return pathname.startsWith('/api');
}

// Extract locale from pathname
function getLocaleFromPath(pathname: string): string {
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length > 0) {
        const firstSegment = segments[0];
        if (locales.includes(firstSegment)) {
            return firstSegment;
        }
    }
    return 'pt-BR'; // Default locale
}

// Routes that require password change
const changePasswordPath = '/change-password';

export default auth(async (req) => {
    const { pathname } = req.nextUrl;
    const session = req.auth;

    // Skip middleware for API routes - they handle auth internally
    if (isApiRoute(pathname)) {
        return NextResponse.next();
    }

    // Apply i18n middleware first
    const response = intlMiddleware(req as unknown as NextRequest);

    // Public routes - allow access
    if (isPublicRoute(pathname)) {
        return response;
    }

    // Get locale from path
    const locale = getLocaleFromPath(pathname);

    // No session - redirect to sign-in
    if (!session?.user) {
        const signInUrl = new URL(`/${locale}/sign-in`, req.url);
        signInUrl.searchParams.set('callbackUrl', pathname);
        return NextResponse.redirect(signInUrl);
    }

    // User must change password - redirect to change password page
    if (session.user.mustChangePassword) {
        // Don't redirect if already on change password page
        if (!pathname.includes(changePasswordPath)) {
            const changePasswordUrl = new URL(`/${locale}/dashboard/change-password`, req.url);
            return NextResponse.redirect(changePasswordUrl);
        }
    }

    return response;
});

export const config = {
    matcher: [
        // Skip Next.js internals and all static files
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        // Always run for API routes
        '/(api|trpc)(.*)',
    ],
};
