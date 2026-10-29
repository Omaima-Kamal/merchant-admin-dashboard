"use client";

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from "react";
import type Keycloak from "keycloak-js";

type AuthContextValue = {
    username?: string;
    roles: string[];
    getToken: () => Promise<string | undefined>;
    logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const KEYCLOAK_URL = process.env.NEXT_PUBLIC_KEYCLOAK_URL;
const KEYCLOAK_REALM = process.env.NEXT_PUBLIC_KEYCLOAK_REALM;
const KEYCLOAK_CLIENT_ID = process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID;

// The promise is stored synchronously (before any await), so React StrictMode's
// double effect reuses it instead of creating a second instance and trying to
// use the single-use login code twice, which causes a redirect loop.
let initPromise: Promise<Keycloak> | null = null;

function initKeycloak(): Promise<Keycloak> {
    initPromise ??= (async () => {
        if (!KEYCLOAK_URL || !KEYCLOAK_REALM || !KEYCLOAK_CLIENT_ID) {
            throw new Error(
                "Missing NEXT_PUBLIC_KEYCLOAK_URL / _REALM / _CLIENT_ID in .env.local (restart the dev server after editing it)",
            );
        }

        // Imported here so it only ever runs in the browser
        const { default: KeycloakClass } = await import("keycloak-js");
        const instance = new KeycloakClass({
            url: KEYCLOAK_URL,
            realm: KEYCLOAK_REALM,
            clientId: KEYCLOAK_CLIENT_ID,
        });

        instance.onAuthError = (e) => console.error("Keycloak auth error:", e);
        instance.onTokenExpired = () => {
            instance.updateToken(30).catch(() => instance.login());
        };

        await instance.init({
            onLoad: "login-required",
            pkceMethod: "S256",
            checkLoginIframe: false,
        });

        return instance;
    })();
    return initPromise;
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [kc, setKc] = useState<Keycloak | null>(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        initKeycloak()
            .then(setKc)
            .catch((e) => {
                console.error("Keycloak init failed:", e);
                setError(true);
            });
    }, []);

    // Hooks must run on every render, so these live ABOVE the early returns.
    // Stable identities: effects that depend on getToken won't re-run on every render.
    const getToken = useCallback(async () => {
        if (!kc) return undefined;
        await kc.updateToken(30).catch(() => kc.login());
        return kc.token;
    }, [kc]);

    const logout = useCallback(() => {
        kc?.logout({ redirectUri: window.location.origin });
    }, [kc]);

    if (error)
        return (
            <p className="p-8 text-red-600">
                Couldn&apos;t reach the login server. Check the browser console for details.
            </p>
        );
    if (!kc) return <p className="p-8 text-gray-500">Signing you in…</p>;

    const value: AuthContextValue = {
        username: kc.tokenParsed?.preferred_username,
        // Realm roles + client roles (your "admin" role is a client role)
        roles: [
            ...(kc.tokenParsed?.realm_access?.roles ?? []),
            ...(kc.tokenParsed?.resource_access?.[KEYCLOAK_CLIENT_ID!]?.roles ?? []),
        ],
        getToken,
        logout,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
    return ctx;
}