var twtQueries = {};

//Auto-streaming
Meteor.startup(function () {
  tp_tweetQueries.find().observe({
    added: function(doc) {
      if (!twtQueries[doc.track]) {
        Meteor.call('streamStatuses', {
          _id: doc._id,
          track: doc.track,
        });
      }
    },
    removed: function(doc) {
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
				access_token_key: config.access_token_key, // <-- fill me
				access_token_secret: config.access_token_secret // <-- fill me
      });
}

//Insert used to cache tweets from stream.
var wrappedTweetInsert = Meteor.bindEnvironment(function(tweet, queryId) {
  tp_tweetCache.insert({
    twitterId: tweet.id_str,
    queryId: queryId,
    createdAt: tweet.created_at,
    text: tweet.text,
    in_reply_to_screen_name: tweet.in_reply_to_screen_name,
    user: {
      name: tweet.user.name,
      screen_name: tweet.user.screen_name,
      profile_image_url: tweet.user.profile_image_url
    },
    entities: tweet.entities,
    timestamp_ms: tweet.timestamp_ms
  }, function(err, res) {
    if (err) {
      console.log(err);
    }
  });
}, "Failed to insert tweet into tp_tweetCache collection.");

Meteor.methods({
	streamStatuses: function(data) {
		var client = twitterCredentials(Meteor.user());
		if(!data) {
			throw Meteor.Error( 500, "'null' is not a valid stream query");
		}

		client.stream('statuses/filter', data, function(stream) {
      twtQueries[data.track] = stream;
      stream.on('data', function(tweet) {
        wrappedTweetInsert(tweet, data._id);
      });

      stream.on('error', function(error) {
        throw Meteor.Error( 500, "An error has occured while trying to stream", error);
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
			track: query,
		}
		tp_tweetQueries.insert(data);
	}
});
