const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/user.model');

// Configura la strategia Google OAuth
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/api/auth/google/callback',
    scope: ['profile', 'email']
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Verifica se l'utente esiste già
      let user = await User.findOne({ googleId: profile.id });
      
      if (user) {
        return done(null, user);
      }
      
      // Se l'utente non esiste, cercalo per email
      const email = profile.emails && profile.emails[0] ? profile.emails[0].value : '';
      user = await User.findOne({ email });
      
      if (user) {
        // Se esiste un account con la stessa email, collega l'account Google
        user.googleId = profile.id;
        if (!user.profilePicture && profile.photos && profile.photos[0]) {
          user.profilePicture = profile.photos[0].value;
        }
        await user.save();
        return done(null, user);
      }
      
      // Crea un nuovo utente
      const newUser = new User({
        name: profile.displayName,
        email: email,
        googleId: profile.id,
        profilePicture: profile.photos && profile.photos[0] ? profile.photos[0].value : ''
      });
      
      await newUser.save();
      done(null, newUser);
    } catch (error) {
      done(error, null);
    }
  }
));

// Serializza e deserializza l'utente per le sessioni
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;