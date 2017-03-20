import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { Collection } from 'meteor/tapfuse:collection-global';
import he from 'he';
import Twitter from 'twitter';

if (typeof Collection.ServerSettings === 'undefined') {
  Collection.ServerSettings = new Mongo.Collection('serversettings');
}

let twtQueries = {};
let config = {};
let client;
let queryObserver;
let allowedObserve = false;
// Create Twitter object with tokens
function twitterCredentials() {
  console.log('🍋', 'created client with config', config);
  if (config) {
    return new Twitter({
      consumer_key: config.consumerKey,
      consumer_secret: config.secret,
      // bearer_token: config.bearer_access_token,
      access_token_key: config.access_token_key,
      access_token_secret: config.access_token_secret,
    });
  }
  return false;
}

// Insert used to cache tweets from stream.
const wrappedTweetInsert = Meteor.bindEnvironment(
  (tweet, data) => {
    console.log('❌', tweet);
    Collection.tp_tweetCache.upsert(
      { _id: tweet.id_str, queryId: data._id },
      {
        $set: {
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
        },
      },
      (err, res) => {
        if (err) {
          console.log('wrappedTweetInsert--', err);
        }
      },
    );
    if (!allowedObserve) {
      twtQueries[data._id].destroy();
    }
  },
  'Failed to insert tweet into tp_tweetCache collection.',
);

function streamStatuses(data) {
  if (!data) {
    throw Meteor.Error(500, "'null' is not a valid stream query");
  }
  const params = {};
  if (data.track) {
    params.track = data.track;
  } else if (data.follow) {
    params.follow = Number(data.follow);
  }
  console.log('🖕 streamStatuses params', params);
  client.stream('statuses/filter', params, stream => {
    twtQueries[data._id] = stream;
    stream.on('data', tweet => {
      wrappedTweetInsert(tweet, data);
    });

    stream.on('error', error => {
      console.log('Streaming error', error);
      restartConnection();
      stream.destroy();
    });
  });
}

function populateTweetCache(data) {
  // const client = twitterCredentials();
  if (!data) {
    throw Meteor.Error(500, "'null' is not a valid stream query");
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
      screen_name: data.follow,
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
  if (allowedObserve) {
    client = twitterCredentials();
    if (client) {
      console.log('🍣', 'obeserve started - Collection.tp_tweetQueries ');
      queryObserver = Collection.tp_tweetQueries
        .find({}, { limit: 1 })
        .observe({
          added: function(doc) {
            populateTweetCache(doc);
            console.log('🍋', 'stream', doc);
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
}

const restartConnection = Meteor.bindEnvironment(() => {
  if (queryObserver) {
    queryObserver.stop();
  }
  twtQueries = {};
  client = null;
  console.log(
    '🍣',
    'Prepared for connection restart to Twitter API in 5 minutes',
  );
  Meteor.setTimeout(
    () => {
      startObservingQueries();
    },
    1000 * 60 * 5,
  );
});

// Auto-streaming
Meteor.startup(() => {
  Collection.ServerSettings
    .find(
      { 'apiTokens.twitter.isReady': true },
      { fields: { 'apiTokens.twitter': 1 }, limit: 1 },
    )
    .observe({
      added: function(doc) {
        const self = doc.apiTokens.twitter;
        if (self.consumerKey && self.secret && self.bearer_access_token) {
          allowedObserve = true;
          console.log('🍣', 'Twitter query observe will start in 60 seconds');
          config = doc.apiTokens.twitter;
          Meteor.setTimeout(
            () => {
              startObservingQueries();
            },
            1000 * 60,
          );
        }
      },
      removed: function(doc) {
        allowedObserve = false;
        config = {};
        console.log('🌶', 'Disabling config');
      },
    });
  // wait not to get 'Exceeded connection limit for user'
});
