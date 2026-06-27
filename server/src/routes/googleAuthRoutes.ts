import { Router } from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { env } from '../config/env';
import { findOrCreateGoogleUser } from '../services/authService';

const router = Router();

if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_CALLBACK_URL) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        callbackURL: env.GOOGLE_CALLBACK_URL,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) {
            done(new Error('No email from Google'));
            return;
          }

          const result = await findOrCreateGoogleUser({
            googleId: profile.id,
            email,
            username: profile.displayName?.replace(/\s+/g, '').slice(0, 20) || `user_${profile.id.slice(0, 8)}`,
            avatarUrl: profile.photos?.[0]?.value,
          });

          done(null, result);
        } catch (err) {
          done(err as Error);
        }
      },
    ),
  );

  router.get(
    '/google',
    passport.authenticate('google', { scope: ['profile', 'email'], session: false }),
  );

  router.get(
    '/google/callback',
    passport.authenticate('google', { session: false, failureRedirect: `${env.CLIENT_URL}/login?error=google` }),
    (req, res) => {
      const result = req.user as Awaited<ReturnType<typeof findOrCreateGoogleUser>>;
      const params = new URLSearchParams({
        accessToken: result.tokens.accessToken,
        refreshToken: result.tokens.refreshToken,
      });
      res.redirect(`${env.CLIENT_URL}/login?${params.toString()}`);
    },
  );
}

export default router;
