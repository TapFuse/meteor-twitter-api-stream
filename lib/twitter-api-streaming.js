import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { Collection } from 'meteor/tapfuse:collection-global';
import he from 'he';
import Twitter from 'twitter';

let twtQueries = {};
let client;
let queryObserver;
// Create Twitter object with tokens
function twitterCredentials() {
  const config = Accounts.loginServiceConfiguration.findOne({service: 'twitter'});
  console.log('🍋', 'created client with config', config);
  if (config) {
    return new Twitter({
      consumer_key: config.consumerKey,
      consumer_secret: config.secret,
      access_token_key: config.accessTokenKey ? config.accessTokenKey : config.access_token_key,
      access_token_secret: config.accessTokenSecret ? config.accessTokenSecret : config.access_token_secret,
    });
  }
  return false;
}

// Insert used to cache tweets from stream.
const wrappedTweetInsert = Meteor.bindEnvironment((tweet, data) => {
  Collection.tp_tweetCache.upsert({_id: tweet.id_str, queryId: data._id}, {$set: {
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
  if (!data) {
    throw Meteor.Error( 500, "'null' is not a valid stream query");
  }
  client.stream('statuses/filter', data, (stream) => {
    twtQueries[data._id] = stream;
    stream.on('data', (tweet) => {
      wrappedTweetInsert(tweet, data);
    });

    stream.on('error', (error) => {
      console.log('Streaming error', error);
      restartConnection();
    });
  });
}

function populateTweetCache(data) {
  // const client = twitterCredentials();
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

function startObservingQueries() {
  client = twitterCredentials();
  if (client) {
    console.log('🍣', 'obeserve started - Collection.tp_tweetQueries ');
    queryObserver = Collection.tp_tweetQueries.find().observe({
      added: function(doc) {
        populateTweetCache(doc);
        console.log('🍋', 'stream');
        streamStatuses(doc);
      },
      removed: function(doc) {
        if (twtQueries[doc._id]) {
          twtQueries[doc._id].destroy();
        }
      },
    });
  }
}

const restartConnection = Meteor.bindEnvironment(() => {
  if (queryObserver) {
    queryObserver.stop();
  }
  twtQueries = {};
  client = null;
  console.log('🍣', 'Prepared for connection restart to Twitter API in 5 minutes');
  Meteor.setTimeout(() => {
    startObservingQueries();
  }, 1000*60*5);
})

// Auto-streaming
Meteor.startup(() => {
  console.log('🍣', 'Twitter query observe will start in 60 seconds');
  // wait not to get 'Exceeded connection limit for user'
  Meteor.setTimeout(() => {
    startObservingQueries();
  }, 1000*60);

});
