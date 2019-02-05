import mongoose from 'mongoose';
import axios from 'axios';

const MongoClient = require('mongodb').MongoClient;

const deployedModelUri = "www.model.com/api";
const keys = require('./keys.json');

// const notificationSchema = mongoose.Schema({
// 	category : String, // Electronics, clothing ..
// 	offerType : String, // Discount, buy 1 get 1 ..
// 	event : String, //Diwali, Holi, New years, Birthday ...
// 	notifcationId : Number,
//  //userID : Number // for nottifications to send
// });
// const Notifcation = mongoose.model('Notifcations', notificationSchema);

// const NNFeatureSchema = mongoose.Schema({
// 	userID : Number,
// 	cat : [Number, Number, Number, Number, Number]
// });
// const NNFeature = mongoose.model('userFeatures', NNFeatureSchema);

// const userClickStreamSchema = mongoose.Schema({
// 	userID : Number,
// 	productID : Number,
// 	timestamp : Number
// });
// const userClickStream = mongoose.model('userClickStream', userClickStreamSchema);

// const userSchema = mongoose.Schema({
// 	id: Number
// });

// const User = mongoose.model('User', userSchema);

const user_features_URI = keys.user_features_URI;
const offer_notifications_URI = keys.offer_notifications_URI;
const notifications_queue_URI = keys.notifications_queue_URI;

let db_user_features = null;
let db_offer_notifications = null;
let db_notifications_queue = null;

let todaysNotifications = null;

exports.handler = async (event) => {
	// if(!todaysNotifications){
	// 	Notifcation.find({}, (err, notifs)=> {
	// 		todaysNotifications = notifs;
	// 	});
	// }

	// if(!db || !db.serverConfig.isConnected()){
	// 	mongoose.connect(keys.dbURL, {
	// 		user : keys.user,
	// 		pass : keys.pass
	// 	})
	// 	.then(() => {
	// 		db = mongoose.connection;
	// 		db.on('error', (err) => {
	// 			console.log('erred', err)
	// 		});

	// 	})
	// 	.then((err) => {
	// 		console.log(err);
	// 	});
	// } else {
	// 	User.find({}, (err, users) => {
	// 		for(let user of users){
	// 			processUser(user)();
	// 		}
	// 	})
	// }

	if(!todaysNotifications){
		MongoClient.connect(offer_notifications_URI, (err, client) => {
			db_offer_notifications = client.db('offer_notifications');
			const notifs = db_offer_notifications.collection('notifications');

			notifs.find({}, (err, res) => {
				todaysNotifications = res;
				startProcessingUsers();
			});
		});
	} else {
		startProcessingUsers();
	}
};

let startProcessingUsers = () => {
	if(!db_user_features || !db_user_features.serverConfig.isConnected()){
		MongoClient.connect(user_features_URI, (err, client) => {
			db_user_features = client.db('user_features');
			return getUsers();
		});
	} else {
		return getUsers();
	}
};


let getUsers = () => {
	const users = db_user_features.collection('users');

	users.find({}, (err, res) => {
		for(let user of res){
			processUser(user)();
		}
	});
};


let processUser = (user) => {
	let processing = () => {
		const nnfeatures = db_user_features.collection('nnfeatures');
		const clickstream = db_user_features.collection('clickstream');
		nnfeatures.findOne({
			userID : user.userID
		}, (err1, features) => {
			clickstream.findOne({
				userID : user.userID
			}, (err2, clicks) => {
				axios.get(deployedModelUri, {
					params : {
						features : JSON.stringify(features),
						clickstream : JSON.stringify(clickstream)
					}
				})
				.then(res => {
					let catRanks = JSON.parse(res).slice(0, 3);
					let notificationsToSend = [];
					for(let notif of todaysNotifications){
						if(catRanks.includes(notif['category'])){
							notif['userID'] = userID;
							notificationsToSend.push(notif);
						}
					}

					// SEND NOTIFICATIONS
					if(!db_notifications_queue || !db_notifications_queue.serverConfig.isConnected()){
						MongoClient.connect(notifications_queue_URI, (err, client) => {
							db_notifications_queue = client.db('notifications_queue');
							return saveNotifications(notificationsToSend);
						});
					} else {
						return saveNotifications(notificationsToSend);
					}
				});
			});
		});
	};

	return processing;
};


let saveNotifications = (notificationsToSend) => {
	db_notifications_queue.collection('notificationsToSend').insertMany(notificationsToSend);
}

// let processUser = (user) => {
// 	let processing = () => {
// 		NNFeature.findOne({
// 			userID : user.userID,	
// 		}, (err1, features) => {

// 			userClickStream.findOne({
// 				userID : user.userID,	

// 			}, (err2, clickstream) => {

// 				axios.get(deployedModelUri, {
// 					params : {
// 						features : JSON.stringify(features),
// 						clickstream : JSON.stringify(clickstream)
// 					}
// 				})
// 				.then(res => {
// 					let catRanks = JSON.parse(res).slice(0, 3);
// 					let notificationsToSend = [];
// 					for(let notif of todaysNotifications){
// 						if(catRanks.includes(notif['category'])){
// 							notificationsToSend.push(notif);
// 						}
// 					}

// 					//SEND NOTIFICATIONS

// 				});

// 			});
// 		});				
// 	};

// 	return processing;	
// };