import express from 'express';
import helmet from 'helmet';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import responseTime from 'response-time';
import mongoose from 'mongoose';
import winston from 'winston';
import logger from './lib/logger';
import settings from './lib/settings';
import security from './lib/security';
import dashboardWebSocket from './lib/dashboardWebSocket';
import ajaxRouter from './ajaxRouter';
import apiRouter from './apiRouter';

const app = express();

security.applyMiddleware(app);
app.set('trust proxy', 1);
app.use(helmet());
app.all('*', (req, res, next) => {
	// CORS headers
	res.header(
		'Access-Control-Allow-Origin',
		security.getAccessControlAllowOrigin()
	);
	res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
	res.header('Access-Control-Allow-Credentials', 'true');
	res.header(
		'Access-Control-Allow-Headers',
		'Origin, X-Requested-With, Content-Type, Accept, Key, Authorization'
	);
	next();
});

app.use(responseTime());
app.use(cookieParser(settings.cookieSecretKey));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use('/ajax', ajaxRouter);
app.use('/api', apiRouter);
app.use(logger.sendResponse);

/* * * * * * ** * * * * * * * * *
	
	HACKATHON WORK STARTS

* * * * * * ** * * * * * * * * */

const sessions = require('express-session');
let ms = sessions.MemoryStore;
const keys = require('./keys.json');

mongoose.connect(
	keys.dbUrl,
	{
		user: keys.user,
		pass: keys.pass
	}
);

let db = mongoose.connection;
db.on('error', err => {
	console.log(err);
});

const userSchema = mongoose.Schema({
	id: Number
});
const User = mongoose.model('User', userSchema);

const NNFeatureSchema = mongoose.Schema({
	userID: Number,
	gaming: {
		searches: Number,
		clicks: Number,
		time: Number,
		itemsChecked: Number,
		inCart: Number
	},
	furniture: {
		searches: Number,
		clicks: Number,
		time: Number,
		itemsChecked: Number,
		inCart: Number
	},
	selfcare: {
		searches: Number,
		clicks: Number,
		time: Number,
		itemsChecked: Number,
		inCart: Number
	},
	clothing: {
		searches: Number,
		clicks: Number,
		time: Number,
		itemsChecked: Number,
		inCart: Number
	},
	footwear: {
		searches: Number,
		clicks: Number,
		time: Number,
		itemsChecked: Number,
		inCart: Number
	}
});
const NNFeature = mongoose.model('userFeatures', NNFeatureSchema);

app.use(
	sessions({
		name: 'dummystore',
		secret: keys.secret,
		resave: true,
		saveUninitialized: true,
		store: new ms()
	})
);

app.post('/api2/login', (req, res) => {
	if (req.session.userid) {
		res.json({
			auth: 'yes'
		});
		return;
	}

	req.session.userid = req.body.id;
	req.session.timestamp = Date.now();
	res.json({
		auth: true
	});

	User.findOne(
		{
			id: req.body.id
		},
		(err, user) => {
			if (user == null) {
				let user = new User({
					id: req.body.id
				});
				user.save();
			}
		}
	);
});

app.post('/api2/currentCat', (req, res) => {
	if (req.session.userid) {
		if (req.session.cat != req.body.cat) {
			req.session.cat = req.body.cat;
			NNFeature.findOneAndUpdate(
				{
					userid: req.session.userid
				},
				{
					$inc: {
						[req.body.cat + '.' + 'time']: req.session.timestamp - Date.now()
					}
				}
			);
			req.session.timestamp = Date.now();
		}
	}
	res.end();
});

app.post('/api2/bannerClicks', (req, res) => {
	if (req.session.userid) {
		NNFeature.findOneAndUpdate(
			{
				userid: req.session.userid
			},
			{
				$inc: {
					[req.body.cat + '.' + 'clicks']: 1
				}
			}
		);
	}
	res.end();
});

app.post('/api2/itemsAddedInCart', (req, res) => {
	if (req.session.userid) {
		NNFeature.findOneAndUpdate(
			{
				userID: req.session.userid
			},
			{
				$set: {
					[req.body.cat + '.' + 'inCart']: 1
				}
			}
		);
	}
	res.end();
});

app.post('/api2/productCategory', (req, res) => {
	if (req.session.userid) {
		NNFeature.findOneAndUpdate(
			{
				userID: req.session.userid
			},
			{
				$inc: {
					[req.body.cat + '.' + 'itemsChecked']: 1
				}
			}
		);
	}
	res.end();
});

app.get('/api2/checkSession', (req, res) => {
	if (req.session.userid) {
		res.json({
			present: true
		});
	} else {
		res.json({
			present: false
		});
	}
});

app.post('/api2/logout', (req, res) => {
	req.session.destroy();
	res.end();
});

/* * * * * * ** * * * * * * * * *
	
	HACKATHON WORK ENDS

* * * * * * ** * * * * * * * * */

const server = app.listen(settings.apiListenPort, () => {
	const serverAddress = server.address();
	winston.info(`API running at http://localhost:${serverAddress.port}`);
});

dashboardWebSocket.listen(server);
