// web.js
var express = require("express");
var logfmt = require("logfmt");
var app = express();
var request = require('request');

var user_access_token = null;
var wake_up_time = null;

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

var OAuth2 = require('simple-oauth2')({
  clientID: "your_client_id", 
  clientSecret: "your_client_secret",
  site: 'https://jawbone.com/auth/oauth2',
  authorizationPath : '/auth/oauth/authorize',
  tokenPath: '/token'
});

// Authorization uri definition
var authorization_uri = OAuth2.AuthCode.authorizeURL({
  redirect_uri: 'http://your_app_url/callback',
  scope: 'basic_read location_read mood_read sleep_read move_read',
  response_type: 'code',
  client_id: 'your_client_id'
});

// Initial page redirecting to Github
app.get('/auth', function (req, res) {
    res.redirect(authorization_uri);
});

// Oauth callback service parsing the authorization token and asking for the access token
app.get('/callback', function (req, res) {
  var _code = req.query.code; 
  console.log('Inside oauth callback');
  OAuth2.AuthCode.getToken({
	client_id: "your_client_id",
	client_secret: "your_client_secret",
	redirect_uri: 'http://your_app_url/callback',
    code: _code
  }, saveToken);

  function saveToken(error, result) {
    if (error) { console.log('Access Token Error', error.message); 
	} else {
		console.log("got the request token.");
	}
	user_access_token = OAuth2.AccessToken.create(result);
	console.log("got the access token: "+user_access_token);
	//you can get the user moves once the token is obtained.
	//getBandEvents();
	res.send('ok');
  }
});

function getBandEvents() {
	var options = {
	    url: 'https://jawbone.com/nudge/api/v.1.1/users/@me/moves',
	    headers: {
	        'Accept': 'application/json',
			'Authorization': 'Bearer '+user_access_token.token.access_token
	    }
	};
	
	request(options, function (error, response, body) {
		if (error) {
			console.log(error);
		}
		console.log("got response");
		console.log(response.statusCode);
		console.log("got user moves");
		console.log(body);
	  if (!error && response.statusCode == 200) {
	    console.log("got error");
	  }
	})
}

/** This endpoint can be used to return the list of (Jawbone) moves of the current user.
 *
 */
app.get('/moves', function(req, res) {
  getBandEvents();
  res.send('Send some data back');
});


/** This endpoint is called by Jawbone servers to notify your app about events.
  * The function below checks for 'exit_sleep_mode' event that indicates user work up and pressed the button on Up band.
  * This function also clears the notification after 5 minutes.
  */
app.post('/notifications', function(req, res) {
	console.log("got jawbone notification");
	var events = req.body.events;
	for(i=0;i<events.length;i++) {
		var _event = events[i];
		if (_event.action == 'exit_sleep_mode') {
			var d = new Date();
			var diff = Math.round(d.getTime()/1000) - _event.timestamp;
			if (diff/60 < 1) {
				console.log("User just woke up...yay!");
				wake_up_time = _event.timestamp;
				setTimeout(function(){ 
					wake_up_time = null; 
					console.log("cleared the notification.")
				}, 50000);
			}
		}
	}
  res.send('Ok');
});

/** Your app client can call this endpoint to check if the user has worken up.
  */
  
app.get('/is_user_awake', function(req, res) {
  var reply = (wake_up_time)? true:false;
  res.send(reply);
});

// Listening on port 3000
var port = Number(process.env.PORT || 3000);

app.listen(port, function() {
  console.log("Listening on " + port);
});

