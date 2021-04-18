// jshint esversion:6

/**
 * Login page // added sucessfully
 * Admin registration // complete sucessfully
 * Admin
 * Employee
 * MongoDB - mongoose
 * ExpressJS
 * nodeJS
 */

// Start my code from here
require("dotenv").config();
const express = require("express"),
    mongoose = require("mongoose"),
    bcrypt = require("bcrypt"),
    session = require("express-session"),
    flash = require("express-flash"),
    passport = require("passport"),
    MongoStore = require("connect-mongo"),
    LocalStrategy = require("passport-local").Strategy;

const app = express();
const url = process.env.MONGO_URL;

app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(flash()); //initialize flash
app.use(
    session({
        secret: process.env.COOKIE_SECRET,
        resave: false,
        saveUninitialized: false,
        store: MongoStore.create({ mongoUrl: url }),
        cookie: { maxAge: 24 * 60 * 60 * 1000 }, //24 hours
    })
);

// Database connection
mongoose.connect(url, { useNewUrlParser: true, useUnifiedTopology: true });

// const adminSchema = new mongoose.Schema({
//     username: String,
//     password: String,
//     role: {type:String, default: "admin"}
// });
const userSchema = new mongoose.Schema({
    username: String,
    password: String,
    name: String,
    department: String,
    DOB: String,
    Phone: String,
    Address: String,
    role: { type: String, default: "employee" },
});

// Passport config
function init(passport) {
    passport.use(
        new LocalStrategy({ usernameField: "uname", passwordField: "pass" }, async (uname, pass, done) => {
            // Login logic
            // Check if username exists
            const user = await User.findOne({ username: uname });
            if (!user) {
                return done(null, false, { message: "No user with this username found!" });
            }
            bcrypt
                .compare(pass, user.password)
                .then((match) => {
                    if (match) {
                        return done(null, user, { message: "Logged in successfully!" });
                    }
                    return done(null, false, { message: "Username or password incorrect!" });
                })
                .catch((err) => {
                    return done(null, false, { message: "Something went wrong!" });
                });
        })
    );

    passport.serializeUser((user, done) => {
        done(null, user._id);
    });

    passport.deserializeUser((id, done) => {
        User.findById(id, (err, user) => {
            done(err, user);
        });
    });
}
// const passportInit = require("./app/config/passport");
init(passport);
app.use(passport.initialize());
app.use(passport.session());

app.use((req, res, next) => {
    // res.locals.session = req.session;
    res.locals.user = req.user
    next();
});

// const Admin = new mongoose.model("Admin", adminSchema);
const User = new mongoose.model("User", userSchema);

// login admin get route
app.get("/", function (req, res) {
    if (!req.isAuthenticated()) {
        return res.render("login");
    }
    if (req.user.role == "admin") {
        res.redirect('/admin');
    } else {
        res.redirect('/employee-home')
    }
});

// login admin post route
app.post("/", function (req, res, next) {
    // object Destructuring
    const { uname, pass } = req.body;
    if (!uname.trim() || !pass.trim()) {
        req.flash("error", "All fields are mandatory");
        req.flash('uname', uname);
        return res.redirect("/");
    }
    passport.authenticate("local", (err, user, info) => {
        if (err) {
            req.flash("error", info.message);
            return next(err);
        }

        if (!user) {
            req.flash("error", info.message);
            return res.redirect("/");
        }
        req.logIn(user, (err) => {
            if (err) {
                req.flash("error", info.flash);
                return next(err);
            }
            if (user.role === "admin") {
                return res.redirect("/admin");
            } else {
                return res.redirect("/employee-home")
            }
        })
    })(req, res, next);
});

// register admin get route
app.get("/register", function (req, res) {
    if (!req.isAuthenticated()) {
        return res.render("register");
    }
    res.redirect('/admin');
});

// register admin post route
app.post("/register", function (req, res) {
    const { uname, pass } = req.body;
    if (!uname.trim() || !pass.trim()) {
        req.flash("error", "All fields are mandatory");
        req.flash("uname", uname);
        return res.redirect("/register");
    }
    // Check if email or phone number already exists
    User.exists({ username: uname }, async (err, result) => {
        if (result) {
            req.flash("error", "Username already exists!");
            return res.redirect("/register");
        } else {
            // Hash Password
            const hashedPassword = await bcrypt.hash(pass, 10);
            // If everything is fine create user
            const user = new User({
                username: uname,
                password: hashedPassword,
                role: "admin"
            });
            user.save().then(() => {
                req.login(user, (err) => {
                    if (err) { return next(err); }
                    return res.redirect("/admin");
                });
            }).catch(err => {
                req.flash("error", "Something went wrong!");
                return res.redirect("/register");
            });
        }
    });


});

// admin home page route
app.get("/admin", function (req, res) {
    if (req.isAuthenticated() && req.user.role == "admin") {
        return res.render("adminHome");
    }
    res.redirect('/');
});

// admin grocery page route
app.get("/admin-grocery", function (req, res) {
    if (req.isAuthenticated()) {
        return res.render("adminGrocery");
    }
    res.redirect('/');
});

// admin employe page route
app.get("/admin-employee", function (req, res) {
    if (req.isAuthenticated()) {
        return res.render("adminEmployee");
    }
    res.redirect('/');
});

// employe home page route
app.get("/employee-home", function (req, res) {
    if (req.isAuthenticated()) {
        return res.render("employeeHome");
    }
    res.redirect('/');
});

// employee grocery page route
app.get("/employee-grocery", function (req, res) {
    if (req.isAuthenticated()) {
        return res.render("employeeGrocery");
    }
    res.redirect('/');
});

app.get('/sign-out', (req, res) => {
    req.logout();
    res.redirect('/');
});

// Server PORT
app.listen(3000, function () {
    console.log("Server Start at PORT 3000");
});
