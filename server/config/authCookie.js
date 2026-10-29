const isProduction = process.env.NODE_ENV === "production" || Boolean(process.env.RENDER);

export const authCookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
};

export const clearAuthCookie = (res) => res.clearCookie("token", {
    httpOnly: true,
    secure: authCookieOptions.secure,
    sameSite: authCookieOptions.sameSite,
    path: authCookieOptions.path,
});
