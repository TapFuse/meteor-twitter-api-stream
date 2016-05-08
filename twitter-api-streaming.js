he = Npm.require('he');
const twtQueries = {};

// Auto-streaming
Meteor.startup(() => {
  tp_tweetQueries.find().observe({
    added: function(doc) {
      if (tp_tweetCache.find({queryId: doc._id}).count() === 0) {
        populateTweetCache(doc);
      }
      if (!twtQueries[doc._id]) {
        streamStatuses(doc);
      }
    },
    removed: function(doc) {
      if (twtQueries[doc._id]) {
        twtQueries[doc._id].destroy();
      }
    },
  });
  tp_tweetCache.find().observe({
    added: function(doc) {
      const count = tp_tweetCache.find({queryId: doc.queryId}).count();
      const tweetQuery = tp_tweetQueries.findOne({_id: doc.queryId});
      if (count && tweetQuery && count > tweetQuery.cacheTweetCount) {
        tp_tweetCache.findAndModify({
          query: {queryId: doc.queryId},
          sort: {createdAt: 1},
          remove: true,
        });
      }
    },
  });
});

// Create Twitter object with tokens
function twitterCredentials() {
  const config = Accounts.loginServiceConfiguration.findOne({service: 'twitter'});
  return new TwitterApi({
    consumer_key: config.consumerKey,
    consumer_secret: config.secret,
    access_token_key: config.accessTokenKey ? config.accessTokenKey : config.access_token_key,
    access_token_secret: config.accessTokenSecret ? config.accessTokenSecret : config.access_token_secret,
  });
}

// Insert used to cache tweets from stream.
const wrappedTweetInsert = Meteor.bindEnvironment((tweet, data) => {
  tp_tweetCache.upsert({_id: tweet.id_str, queryId: data._id}, {$set: {
    id_str: tweet.id_str,
    queryId: data._id,
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

function streamStatuses(data) {
  const client = twitterCredentials();
  if (!data) {
    throw Meteor.Error( 500, "'null' is not a valid stream query");
  }
  client.stream('statuses/filter', data, (stream) => {
    twtQueries[data._id] = stream;
    stream.on('data', (tweet) => {
      let hasHashtag = false;
      const hashtags = tweet.entities.hashtags;
      for (const hashtag of hashtags) {
        if (hashtag.text.toLowerCase() === data.track.toLowerCase()) {
          hasHashtag = true;
          break;
        }
      }
      if (hasHashtag || tweet.user.id === data.follow) {
        wrappedTweetInsert(tweet, data);
      }
    });

    stream.on('error', (error) => {
      console.log('Streaming error', error);
    });
  });
}

function populateTweetCache(data) {
  const client = twitterCredentials();
  if (!data) {
    throw Meteor.Error( 500, "'null' is not a valid stream query");
  }

  if (data.track) {
    const params = {
      q: data.track,
    };
    client.get('search/tweets', params, (error, tweets) => {
      if (!error) {
        for (const tweet of tweets.statuses) {
          wrappedTweetInsert(tweet, data);
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
        for (const tweet of tweets) {
          wrappedTweetInsert(tweet, data);
        }
      } else {
        console.log(error);
      }
    });
  }
}

function destroyOneStream(streamToDestroy) {
  streamToDestroy.destroy();
}

function addStreamingQuery(hashtags, users, count) {
  data = {
    track: hashtags,
    follow: users,
    createdAt: new Date(),
    cacheTweetCount: count,
  };
  tp_tweetQueries.insert(data);
}
