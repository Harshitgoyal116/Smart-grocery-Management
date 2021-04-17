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

const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const md5 = require('md5');

const app = express();

app.set("view engine", "ejs");
app.use(express.urlencoded({extended: true}));
app.use(express.static("public"));

// Database connection
mongoose.connect("mongodb://localhost:27017/sgmDB", {useNewUrlParser: true, useUnifiedTopology: true});

const adminSchema = new mongoose.Schema({
    username: String,
    password: String
});
const employeeSchema = new mongoose.Schema({
    username: String,
    password: String
});

const Admin = new mongoose.model("Admin", adminSchema);
const Employee = new mongoose.model("Employee", employeeSchema);

app.get("/", function(req,res){
    let noError = [];
    res.render("login", {errors: noError});
});

app.post("/", function(req, res){
    let displayError = [];

    const username = req.body.uname;
    const password = req.body.pass;
    const dropDown = req.body.dropBox;
    // console.log(dropDown);

    if(dropDown === "admin"){
    Admin.findOne({username: username}, function(err, foundAdmin){
        if(err){
            console.log(err);
        } else {
            if(foundAdmin){
                if(foundAdmin.password === password){
                    res.redirect("admin");
                }else{
                    // alert("Login Failed, Enter valid credentials", 'showAlert');
                    displayError.push({text: "Invalid username or password!"});
                }
            }else{
                displayError.push({text: "Invalid username or password!"});
            }
        }
        if(displayError.length > 0){
            res.render("login", {errors: displayError});
        }
    });
}else{
    Employee.findOne({username: username}, function(err, foundEmployee){
        if(err){
            console.log(err);
        } else {
            if(foundEmployee){
                if(foundEmployee.password === password){
                    res.redirect("employee-home");
                }else{
                    // alert("Login Failed, Enter valid credentials", 'showAlert');
                    displayError.push({text: "Invalid username or password!"});
                }
            }else{
                displayError.push({text: "Invalid username or password!"});
            }
        }
        if(displayError.length > 0){
            res.render("login", {errors: displayError});
        }
    });
}
});

app.get('/register', function(req, res){
    res.render("register");
});

app.post('/register', function(req, res){
    const newAdmin = new Admin({
        username: req.body.uname,
        password: req.body.pass
    });

    newAdmin.save(function(err){
        if(err){
            console.log(err);
        }else{
            res.redirect("/");
        }
    });
});

app.get('/admin', function(req, res){
    res.render("adminHome");
});

app.get('/admin-grocery', function(req, res){
    res.render("adminGrocery");
});

app.get('/admin-employee', function(req, res){
    res.render("adminEmployee");
});

app.get('/employee-home', function(req, res){
    res.render("employeeHome");
});

app.get('/employee-grocery', function(req, res){
    res.render("employeeGrocery");
});

 app.listen(3000, function(){
     console.log("Server Start at PORT 3000");
 });