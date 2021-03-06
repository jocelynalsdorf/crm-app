//Base Setup
//===========================

//Call the packages

var express = require('express'); //call express
var app = express(); //define app using express
var User = require('./app/models/user'); //pull in our UserSchema model
var bodyParser = require('body-parser');//get body-parser
var morgan = require('morgan'); //used to see requests
var mongoose = require('mongoose') //used to connect to database
var port = process.env.PORT || 8080; //set the port for the app
var jwt = require('jsonwebtoken');
var superSecret = 'ilovescotchscotchyscotchscotch';

//APP CONFIGURATION ===========
//middleware
//use body parser to grab info from POST requests
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

//configure our app to handle CORS requests 

app.use(function(req, res, next){
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
  res.setHeader('Access-COntrol-Allow-Headers', 'X-Requested-With,content-type,Authorization');
  next();
});

//log all requests to the console
app.use(morgan('dev'));

//Routes for API ===============

//basic route for home page

app.get('/', function(req, res){
  res.send('Welcome to the home page');
});

//get an instance of the express router to use as a base route
var apiRouter = express.Router();

//add route for authentication and place BEFORE middleware @ http://localhost:8000/api/authenticate
apiRouter.post('/authenticate', function(req,res){
  User.findOne({
    username: req.body.username
  }).select('name username password').exec(function(err,user){
    if(err) throw err;
    //if no user is found do this
    if(!user) {
      res.json({
        success: false,
        message: 'Authentication failed. user not found.'
      });
      //is user is found do this
    } else if (user) {
      //check if password matches
      var validPassword = user.comparePassword(req.body.password);
      if (!validPassword) {
        res.json({
          success:false,
          message: 'Authentication failed.wrong password.'
        });
      } else {
        //if user is found and password is right create a token
        var token = jwt.sign({
          name: user.name,
          username: user.username
        }, superSecret, {
          expiresInMinutes: 1440 //24 hours
        });
        //return the information including token as json
        res.json({
          success: true,
          message: 'Enjoy your token!',
          token: token
        });
      }
    }
  })
});

//middleware to use for all requests
apiRouter.use(function(req, res, next){
 //route middleware to verigy a token

  //check header or url parameteres of post parameters for token
  var token = req.body.token || req.query.token || req.headers['x-access-token'];
//decode the token
  if(token) {
    //verify secret and checks expiration
    jwt.verify(token, superSecret, function(err, decoded){
      //create message in callback
      if (err) {
        return res.status(403).send({
          success: false,
          message: 'Failed to authenticate token'
        });
      } else {
        //if everything is ok, save to request for use in other routes
        req.decoded = decoded;
        //next is now here so that the user only continue on if there is successful authentication
        next();
      }
    });
  } else {
    //if there is no token return an HTTP response of 403(access forbidden) $ error message
    return res.status(403).send({
      success: false,
      message: 'No token provided'
    });
  }

});



//test route to make sure everything is working
//access: GET http://localhost:8080/api
apiRouter.get('/', function(req, res){
  res.json({message: 'Hoorray! Welcome to our api'});
});

//more routes for api will go here

//Register routes ===============
//all of these routes will be prefixed with /api

//routes that end in /users========
apiRouter.route('/users')
  .post(function(req,res){
    //create new instance of user model
    var user = new User();
    //set the users info that comes from the request
    user.name = req.body.name;
    user.username = req.body.username;
    user.password =  req.body.password;
    //save the user and look for any errors
    user.save(function(err){
      if(err) {
        //if duplicate
        if (err.code == 11000)
          return res.json({success: false, message: 'A user with that name already exists'});
        else 
          return res.send(err);
      }

      res.json({message: 'User created'});
    });
  })
  //get all the users from /api/users
  .get(function(req,res){
    User.find(function(err, users){
      if(err) res.send(err);

      //return the users
      res.json(users);
    });
  });

//routes that end in user/:user_id ==========

apiRouter.route('/users/:user_id')
//get user with the id
  .get(function(req, res){
    User.findById(req.params.user_id, function(err, user){
      //handle any errors
      if (err) res.send(err);
      //return that user if no error is thrown
      res.json(user);
    });
  })
   //update user with this id
  .put(function(req, res){
    User.findById(req.params.user_id, function(err, user){
      //handle the error
      if(err) res.send(err);

      //update user info only if its new
      if (req.body.name) user.name = req.body.name;
      if (req.body.username) user.username = req.body.username;
      if (req.body.password) user.password = req.body.password;

      //save the user
      user.save(function(err){
        if (err) res.send(err);
        //return a message
        res.json({message: 'User updated'});
      });
    });  
  })
  .delete(function(req,res){
    //delete a user
    User.remove({
      _id: req.params.user_id
    }, function(err, user){
      if(err) return res.send(err);
      res.json({message: 'Successfully deleted'});
    });
  });

//adds endpoint to get user information so we can store users info
apiRouter.get('/me', function(req,res){
  res.send(req.decoded);
});

app.use('/api', apiRouter);

//start the server ==============
app.listen(port);
console.log('Magic happens on port ' + port);

//connect to database 

mongoose.connect('mongodb://project1:project1@apollo.modulusmongo.net:27017/U2xysiro');






