TweetCache = new Meteor.Collection('tweets');
TweetQueryCache = new Meteor.Collection('tweetQueries');
var twtQueries = {};

//Auto-streaming
Meteor.startup(function () {
  TweetQueryCache.find().observeChanges({
		added: function(id, doc) {
			if (!twtQueries[doc.track]) {
				Meteor.call('streamStatuses', doc);
			}
		},
		removed: function(id, doc) {
			if (twtQueries[doc.track]) {
				twtQueries[doc.track].destroy();
			}
		}
	});
});

//Create Twitter object with tokens
function twitterCredentials (meteorUser) {
		var config = Accounts.loginServiceConfiguration.findOne({service: 'twitter'});
		return new TwitterApi({
				consumer_key: config.consumerKey,
				consumer_secret: config.secret,
				access_token_key: '1736677940-e8N8Q3va5ZlWby2GSvEEQDVngnDcuAPF7sgouRY',
				access_token_secret: 'Ny8YptHsTQ87vWUxOk4onZJtMALKLE9JvSqkHo1CHezJl'
		});
	}

//Insert used to cache tweets from stream.
var wrappedTweetInsert = Meteor.bindEnvironment(function(tweet) {
    TweetCache.insert(tweet);
}, "Failed to insert tweet into TweetCache collection.");

Meteor.methods({
	streamStatuses: function(data) {
		var client = twitterCredentials(Meteor.user());
		if(!data) {
			data = {
				track: 'javascript'
			}
		}

		client.stream('statuses/filter', data, function(stream) {
			twtQueries[data.track] = stream;
		  stream.on('data', function(tweet) {
		  	wrappedTweetInsert(tweet);
		  });

		  stream.on('error', function(error) {
		    throw error;
		  });
		});
	},
	destroyOneStream: function(streamToDestroy){
		streamToDestroy.destroy();
	},
	destroyStreams: function() {
		for (var i in twtQueries) {
			twtQueries[i].destroy();
			twtQueries.splice(i, 1);
		}
	},
	addStreamingQuery: function (query) {
		data = {
			track: query
		}
		TweetQueryCache.insert(data);
	}
});