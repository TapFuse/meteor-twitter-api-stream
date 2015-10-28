var twtQueries = {};

//Auto-streaming
Meteor.startup(function () {
  tp_tweetQueries.find().observe({
    added: function(doc) {
      if (!twtQueries[doc._id]) {
        Meteor.call('streamStatuses', {
          _id: doc._id,
          track: doc.track,
          follow: doc.follow,
        });
      }
    },
    removed: function(doc) {
      if (twtQueries[doc._id]) {
        twtQueries[doc._id].destroy();
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
    id_str: tweet.id_str,
    queryId: queryId,
    created_at: tweet.created_at,
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
      twtQueries[data._id] = stream;
      stream.on('data', function(tweet) {
        var hasHashtag = false;
        var hashtags = tweet.entities.hashtags;
        for (var i = hashtags.length - 1; i >= 0; i--) {
          if(hashtags[i].text.toLowerCase() == data.track.toLowerCase()) {
            hasHashtag = true;
            break;
          }
        }
        if(hasHashtag || tweet.user.id == data.follow) {
          wrappedTweetInsert(tweet, data._id);
        }
      });

      stream.on('error', function(error) {
        console.log('Streaming error', error);
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
	addStreamingQuery: function (hashtags, users) {
		data = {
			track: hashtags,
      follow: users,
		}
		tp_tweetQueries.insert(data);
	}
});
