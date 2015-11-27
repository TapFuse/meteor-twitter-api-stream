he = Npm.require('he');
const twtQueries = {};

// Auto-streaming
Meteor.startup(() => {
  tp_tweetQueries.find().observe({
    added: function(doc) {
      const tweetQuery = {
        _id: doc._id,
        track: doc.track,
        follow: doc.follow,
      };
      if (tp_tweetCache.find().count() === 0) {
        Meteor.call('populateTweetCache', tweetQuery);
      }
      if (!twtQueries[doc._id]) {
        Meteor.call('streamStatuses', tweetQuery);
      }
    },
    removed: function(doc) {
      if (twtQueries[doc._id]) {
        twtQueries[doc._id].destroy();
      }
    },
  });
});

// Create Twitter object with tokens
function twitterCredentials(meteorUser) {
  const config = Accounts.loginServiceConfiguration.findOne({service: 'twitter'});
  return new TwitterApi({
    consumer_key: config.consumerKey,
    consumer_secret: config.secret,
    access_token_key: config.accessTokenKey ? config.accessTokenKey : config.access_token_key,
    access_token_secret: config.accessTokenSecret ? config.accessTokenSecret : config.access_token_secret,
  });
}

// Insert used to cache tweets from stream.
const wrappedTweetInsert = Meteor.bindEnvironment((tweet, queryId) => {
  tp_tweetCache.upsert({_id: tweet.id_str, queryId: queryId}, {$set: {
    id_str: tweet.id_str,
    queryId: queryId,
    created_at: tweet.created_at,
    text: he.decode(tweet.text),
    in_reply_to_screen_name: tweet.in_reply_to_screen_name,
    user: {
      name: tweet.user.name,
      screen_name: tweet.user.screen_name,
      profile_image_url: tweet.user.profile_image_url,
    },
    entities: tweet.entities,
    timestamp_ms: tweet.timestamp_ms,
    createdAt: new Date(),
    createdAtFormatted: new Date(tweet.created_at),
  }}, (err, res) => {
    if (err) {
      console.log(err);
    }
  });
}, 'Failed to insert tweet into tp_tweetCache collection.');

Meteor.methods({
  streamStatuses: function(data) {
    const client = twitterCredentials(Meteor.user());
    if (!data) {
      throw Meteor.Error( 500, "'null' is not a valid stream query");
    }
    client.stream('statuses/filter', data, (stream) => {
      twtQueries[data._id] = stream;
      stream.on('data', (tweet) => {
        let hasHashtag = false;
        const hashtags = tweet.entities.hashtags;
        for (let i = hashtags.length - 1; i >= 0; i--) {
          if (hashtags[i].text.toLowerCase() === data.track.toLowerCase()) {
            hasHashtag = true;
            break;
          }
        }
        if (hasHashtag || tweet.user.id === data.follow) {
          wrappedTweetInsert(tweet, data._id);
        }
      });

      stream.on('error', (error) => {
        console.log('Streaming error', error);
      });
    });
  },
  populateTweetCache: function(data) {
    const client = twitterCredentials(Meteor.user());
    if (!data) {
      throw Meteor.Error( 500, "'null' is not a valid stream query");
    }

    if (data.track) {
      const params = {
        q: data.track,
      };
      client.get('search/tweets', params, (error, tweets) => {
        if (!error) {
          for (let i = 0; i < tweets.statuses.length; i++) {
            wrappedTweetInsert(tweets.statuses[i], data._id);
          }
        } else {
          console.log(error);
        }
      });
    } else if (data.follow) {
      const params = {
        user_id: data.follow,
      };
      client.get('statuses/user_timeline', params, (error, tweets) => {
        if (!error) {
          for (let i = 0; i < tweets.length; i++) {
            wrappedTweetInsert(tweets[i], data._id);
          }
        } else {
          console.log(error);
        }
      });
    }
  },
  destroyOneStream: function(streamToDestroy) {
    streamToDestroy.destroy();
  },
  addStreamingQuery: function(hashtags, users) {
    data = {
      track: hashtags,
      follow: users,
      createdAt: new Date(),
    };
    tp_tweetQueries.insert(data);
  },
});
