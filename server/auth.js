import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import dotenv from "dotenv";
import { User } from "./models/userModel.js";

dotenv.config();

passport.use(
  new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/callback",
    
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      console.log("Google profile:", profile.id, profile.displayName);
      
      let user = await User.findOne({googleId: profile.id});
      
      if(!user) {
        console.log("Creating new user for Google ID:", profile.id);
        user = await User.create({
          googleId: profile.id,
          name: profile.displayName,
          email: profile.emails[0].value,
          profilePic: profile.photos[0].value,
          score: 500
        });
        console.log("New user created:", user._id);
      } else {
        console.log("Existing user found:", user._id);
      }
      
      return done(null, user);
    } catch(err) {
      console.error("Google auth error:", err);
      return done(err, null);
    }
  })
);

passport.serializeUser((user, done) => {
  console.log("Serializing user:", user._id);
  done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
  try {
    console.log("Deserializing user ID:", id);
    const user = await User.findById(id);
    if (!user) {
      console.log("User not found during deserialization");
      return done(null, false);
    }
    console.log("Deserialized user:", user._id);
    done(null, user);
  } catch(err) {
    console.error("Deserialization error:", err);
    done(err, null);
  }
});
