const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
// Router Objects
const indexRouter = require("./routes/index");
const projectsRouter = require("./routes/projects");
const coursesRouter = require("./routes/courses");
// Import MongoDB and Configuration modules
const mongoose = require("mongoose");
const configs = require("./configs/globals");
// HBS Helper Methods
const hbs = require("hbs");
// Import passport and session modules
const passport = require("passport");
const session = require("express-session");
// Import user model
const User = require("./models/user");
// Import Google OAuth strategy
const GoogleStrategy = require("passport-google-oauth20").Strategy;
// Express App Object
const app = express();

const createError = require("http-errors");


// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "hbs");

// Express Configuration
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

// Configure session for passport
app.use(
  session({
    secret: "s2021pr0j3ctTracker",
    resave: false,
    saveUninitialized: false,
  })
);

// Initialize passport
app.use(passport.initialize());
app.use(passport.session());

// Link passport to the user model
passport.use(User.createStrategy());

// Configure Google strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: configs.Authentication.Google.ClientId,
      clientSecret: configs.Authentication.Google.ClientSecret,
      callbackURL: configs.Authentication.Google.CallbackUrl,
    },
    async (accessToken, refreshToken, profile, done) => {
      const user = await User.findOne({ oauthId: profile.id });
      if (user) {
        return done(null, user);
      } else {
        const newUser = new User({
          username: profile.displayName,
          oauthId: profile.id,
          oauthProvider: "Google",
          created: Date.now(),
        });
        const savedUser = await newUser.save();
        return done(null, savedUser);
      }
    }
  )
);

// Set passport to serialize/deserialize user data
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// Routing Configuration
app.use("/", indexRouter);
app.use("/projects", projectsRouter);
app.use("/courses", coursesRouter);

// Connecting to the DB
mongoose
  .connect(configs.ConnectionStrings.MongoDB, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Connected Successfully!"))
  .catch((error) => console.log(`Error while connecting: ${error}`));

// HBS Helpers
hbs.registerHelper("createOptionElement", (currentValue, selectedValue) => {
  const selectedProperty = currentValue == selectedValue.toString() ? "selected" : "";
  return new hbs.SafeString(`<option ${selectedProperty}>${currentValue}</option>`);
});

hbs.registerHelper("toShortDate", (longDateValue) => {
  return new hbs.SafeString(longDateValue.toLocaleDateString("en-CA"));
});

// Catch 404 and forward to error handler
app.use((req, res, next) => {
  next(createError(404));
});

// Error handler
app.use((err, req, res, next) => {
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};
  res.status(err.status || 500);
  res.render("error");
});

module.exports = app;
