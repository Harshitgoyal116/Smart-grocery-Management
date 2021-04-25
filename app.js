// jshint esversion:6

/**
 * Await -  execute line by line
 * Async - 
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
        cookie: { maxAge: 24 * 60 * 60 * 1000 } //24 hours
    })
);

// Database connection
mongoose.connect(url, { useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false });

const grocerySchema = new mongoose.Schema({
    id: String,
    name: String,
    exp: String,
    mfd: String,
    qty: Number,
    cp: Number,
    sp: Number
});

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

    // it provides req.user object in frontend as well as in backend
    passport.serializeUser((user, done) => {
        done(null, user._id);
    });

    passport.deserializeUser((id, done) => {
        User.findById(id, (err, user) => {
            done(err, user);
        });
    });
}
// call passport function
init(passport);
app.use(passport.initialize());
app.use(passport.session());

app.use((req, res, next) => {
    res.locals.session = req.session;
    res.locals.user = req.user
    next();
});

// const Admin = new mongoose.model("Admin", adminSchema);
const User = new mongoose.model("User", userSchema);
const Grocery = new mongoose.model("Grocery", grocerySchema);

// all routes

// login admin get route
app.get("/", function (req, res) {
    if (!req.isAuthenticated()) {
        return res.render("login");
    }
    res.redirect('/home');
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
            req.flash('uname', uname);
            return next(err);
        }

        if (!user) {
            req.flash("error", info.message);
            req.flash('uname', uname);
            return res.redirect("/");
        }
        req.logIn(user, (err) => {
            if (err) {
                req.flash("error", info.flash);
                req.flash('uname', uname);
                return next(err);
            }
            return res.redirect("/home")
        })
    })(req, res, next);
});

// register admin get route
app.get("/register", function (req, res) {
    if (!req.isAuthenticated()) {
        return res.render("register");
    }
    res.redirect('/home');
});

// register admin post route
app.post("/register", function (req, res) {
    const { uname, pass } = req.body;
    if (!uname.trim() || !pass.trim()) {
        req.flash("error", "All fields are mandatory");
        req.flash("uname", uname);
        return res.redirect("/register");
    }
    // Check if username already exists
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
                    return res.redirect("/home");
                });
            }).catch(err => {
                req.flash("error", "Something went wrong!");
                return res.redirect("/register");
            });
        }
    });


});

// admin home page get route
app.get("/home", function (req, res) {
    if (req.isAuthenticated()) {
        Grocery.find({}, null, { sort: { 'qty': 1 } }, function (err, items) {
            res.render("home", {
                product: items,
                current: "home"
            });
        })
    } else {
        res.redirect('/');
    }
});

// grocery module page get route
app.get("/grocery", function (req, res) {
    if (req.isAuthenticated()) {
        Grocery.find({}, function (err, foundData) {
            res.render("grocery", {
                data: foundData,
                current: "grocery"
            });
        })
    } else {
        res.redirect('/');
    }
});

// Grocery Module post route for add records
app.post("/grocery", function (req, res) {
    const { id, name, exp, mfd, qty, cp, sp } = req.body;
    if (!id.trim() || !name.trim() || !exp.trim() || !mfd.trim() || !qty.trim() || !cp.trim() || !sp.trim()) {
        req.flash("error", "All fields are mandatory");
        return res.redirect("/grocery");
    } else {
        const grocery = new Grocery({
            id: id,
            name: name,
            exp: exp,
            mfd: mfd,
            qty: qty,
            cp: cp,
            sp: sp
        });

        grocery.save(function (err) {
            if (err) {
                console.log(err);
            } else {
                req.flash("success", "Record added sucessfully!");
                res.redirect("/grocery");
            }
        });
    }
});

// Delete grocery items post route
app.post('/delete_grocery', function (req, res) {
    Grocery.findByIdAndDelete(req.body.itemId, (err, grocery) => {
        if (err) {
            req.flash("error", "Something went wrong, try again!");
            res.redirect("/grocery");
        } else {
            req.flash("success", "Record successfully deleted!");
            res.redirect("/grocery");
        }
    });
});

// Modify grocery items post route
app.post('/modify_grocery', function (req, res) {
    const { id, name, exp, mfd, qty, cp, sp } = req.body;
    if (!id.trim() || !name.trim() || !exp.trim() || !mfd.trim() || !qty.trim() || !cp.trim() || !sp.trim()) {
        req.flash("error", "All fields are mandatory");
        return res.redirect("/grocery");
    } else {
        Grocery.findByIdAndUpdate(req.body.dbId, {
            id: id,
            name: name,
            exp: exp,
            mfd: mfd,
            qty: qty,
            cp: cp,
            sp: sp
        }, (err, product) => {
            req.flash("success", "Record update sucessfully!");
            res.redirect("/grocery");
        });
    }
});

// admin employe page get route
app.get("/employee", function (req, res) {
    if (req.isAuthenticated() && req.user.role == "admin") {
        User.find({}, function (err, foundUser) {
            res.render("employee", {
                employee: foundUser,
                current: "employee"
            });
        })
    } else {
        res.redirect('/');
    }
});

// Employee Module post route for add records
app.post('/employee', async function (req, res) {
    const { username, password, name, department, DOB, Phone, Address } = req.body;
    if (!username.trim() || !password.trim() || !name.trim() || !department.trim() || !DOB.trim() || !Phone.trim() || !Address.trim()) {
        req.flash("error", "All fields are mandatory");
        return res.redirect("/employee");
    } else {
        //hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({
            username: username,
            password: hashedPassword,
            name: name,
            department: department,
            DOB: DOB,
            Phone: Phone,
            Address: Address
        });
        user.save(function (err) {
            if (err) {
                console.log(err);
                req.flash("error", "Something went wrong!");
                res.redirect('/employee');
            } else {
                req.flash("success", "Record added sucessfully!");
                res.redirect("/employee");
            }
        });
    }
});

// Delete Employee Record post route
app.post('/delete_employee', function (req, res) {
    User.findByIdAndDelete(req.body.userId, (err, employee) => {
        if (err) {
            req.flash("error", "Something went wrong, try again!");
            res.redirect("/employee");
        } else {
            req.flash("success", "Record successfully deleted!");
            res.redirect("/employee");
        }
    });
});

// Modify Employee Record Post route
app.post('/modify_employee', async function (req, res) {
    const { username, password, name, department, DOB, Phone, Address } = req.body;
    if (!username.trim() || !name.trim() || !department.trim() || !DOB.trim() || !Phone.trim() || !Address.trim()) {
        req.flash("error", "All fields are mandatory");
        return res.redirect("/employee");
    } else {
        if (!password.trim()) {
            User.findByIdAndUpdate(req.body.dbId, {
                username: username,
                name: name,
                department: department,
                DOB: DOB,
                Phone: Phone,
                Address: Address
            }, (err, product) => {
                req.flash("success", "Record update sucessfully!");
                res.redirect("/employee");
            });
        } else {
            const hashedPassword = await bcrypt.hash(password, 10);
            User.findByIdAndUpdate(req.body.dbId, {
                username: username,
                password: hashedPassword,
                name: name,
                department: department,
                DOB: DOB,
                Phone: Phone,
                Address: Address
            }, (err, product) => {
                req.flash("success", "Record update sucessfully!");
                res.redirect("/employee");
            });
        }
    }
});

// Profile page get route
app.get('/profile', function (req, res) {
    if (req.isAuthenticated()) {
        res.render("profile", {
            current: "profile"
        });
    } else {
        res.redirect('/');
    }
});

// modify user profile post route
app.post('/modify_profile', function (req, res) {
    const { username, name, department, DOB, Phone, Address } = req.body;
    if (!username.trim() || !name.trim() || !department.trim() || !DOB.trim() || !Phone.trim() || !Address.trim()) {
        req.flash("error", "All fields are mandatory");
        return res.redirect("/profile");
    } else {
        User.findByIdAndUpdate(req.body.dbId, {
            username: username,
            name: name,
            department: department,
            DOB: DOB,
            Phone: Phone,
            Address: Address
        }, (err, product) => {
            req.flash("success", "Profile updated sucessfully!");
            res.redirect("/profile");
        });
    }
});

// Change password post route
app.post('/change_password', async function (req, res) {
    const { newPassword, confirmPassword } = req.body;
    if (newPassword == confirmPassword) {
        if (!newPassword.trim() || !confirmPassword.trim()) {
            req.flash("error", "All fields are mandatory");
            return res.redirect("/profile");
        } else {
            const newHashedPassword = await bcrypt.hash(newPassword, 10);
            User.findByIdAndUpdate(req.user._id, {
                password: newHashedPassword
            }, (err, product) => {
                req.flash("success", "Password updated sucessfully!");
                res.redirect("/profile");
            });
        }
    } else {
        req.flash("error", "new password should match with confirm password!");
        res.redirect('/profile');
    }
});

// delete account post route
app.post('/delete_account', function (req, res) {
    User.findByIdAndDelete(req.body.userId, (err, employee) => {
        if (err) {
            req.flash("error", "Something went wrong, try again!");
            res.redirect("/sign-out");
        } else {
            req.flash("success", "Profile deleted successfully!");
            res.redirect("/sign-out");
        }
    });
});

// invoice module get route
app.get('/invoice', function (req, res) {
    if (req.isAuthenticated()) {
        res.render('invoice', {
            current: 'invoice'
        });
    } else {
        res.redirect('/');
    }
});

// print Laypot page post route
app.post('/invoice', async function (req, res) {
    const { customerName, customerNumber, itemId } = req.body;
    if (!customerName.trim() || !customerNumber.trim() || !itemId.trim()) {
        req.flash("error", "All fields are required");
        return res.redirect('/invoice');
    }
    if (!req.session.bill) {
        req.session.bill = {
            items: {},
            totalAmt: 0,
            customer_name: customerName,
            customer_number: customerNumber
        }
    }
    let bill = req.session.bill;
    await Grocery.findOne({ id: itemId }, function (err, foundItem) {
        if (err) {
            req.flash("error", "Something went wrong!");
            return res.redirect('/invoice');
        }
        if (!foundItem) {
            req.flash("error", "Item not found!");
            return res.redirect('/invoice');
        }
        if (foundItem.qty < 1) {
            req.flash("error", "Insuficient items!");
            req.flash('name', customerName);
            req.flash('number', customerName);
            return res.redirect('/invoice');
        } else {
            if (!bill.items[foundItem._id]) {
                bill.items[foundItem._id] = {
                    item: foundItem,
                    qty: 1
                }
                bill.totalAmt = bill.totalAmt + foundItem.sp;
            } else {
                bill.items[foundItem._id].qty = bill.items[foundItem._id].qty + 1;
                bill.totalAmt = bill.totalAmt + foundItem.sp;
            }
            req.flash('name', customerName);
            req.flash('number', customerNumber);
            res.redirect('/invoice');
        }
    });
});

// minus qty post route
app.post('/invoice/minus_qty', function (req, res) {
    const itemID = req.body.dbId;
    const bill = req.session.bill;
    bill.totalAmt -= bill.items[itemID].item.sp;
    bill.items[itemID].qty -= 1;
    req.flash('name', req.session.bill.customer_name);
    req.flash('number', req.session.bill.customer_number);
    if (bill.items[itemID].qty == 0) {
        delete bill.items[itemID];
    }
    if (Object.keys(bill.items).length === 0) {
        delete req.session.bill;
    }
    return res.redirect('/invoice');
});

// Plus qty post route
app.post('/invoice/plus_qty', async function (req, res) {
    const itemID = req.body.dbId;
    const bill = req.session.bill;
    await Grocery.findById(itemID, function (err, foundItem) {
        if (foundItem.qty < (bill.items[itemID].qty) + 1) {
            req.flash("error", "Insuficient items!");
            req.flash('name', req.session.bill.customer_name);
            req.flash('number', req.session.bill.customer_number);
            return res.redirect('/invoice');
        } else {
            bill.totalAmt += bill.items[itemID].item.sp;
            bill.items[itemID].qty += 1;
            req.flash('name', req.session.bill.customer_name);
            req.flash('number', req.session.bill.customer_number);
            return res.redirect('/invoice');
        }
    });
});

// clear button to delete session using get route
app.get('/invoice/clear', function (req, res) {
    delete req.session.bill;
    res.redirect('/invoice');
});

// print layout get route
app.get('/print_bill', function (req, res) {
    if (req.isAuthenticated()) {
        res.render('printLayout');
    } else {
        res.redirect('/');
    }
});

// reduce qty from the table while print bill
app.post('/print_bill/update', function (req, res) {
    if (!req.session.bill) {
        return res.redirect('/print_bill');
    }
    for (itemSet of Object.values(req.session.bill.items)) {
        Grocery.findByIdAndUpdate(itemSet.item._id, { "$inc": { 'qty': -itemSet.qty } }, function (err, foundItems) {
            if (err) {
                console.log(err);
            }
        });
    }
});

// sign out to login page
app.get('/sign-out', (req, res) => {
    req.logout();
    res.redirect('/');
});

// 404 pages
app.get('/*', function (req, res) {
    res.render("404page");
});

// Server PORT
app.listen(3000, function () {
    console.log("Server Start at PORT 3000");
});