Package.describe({
  name: 'tapfuse:twitter-api-streaming',
  version: '6.2.0',
  summary: 'Tweet caching',
  git: '',
  documentation: 'README.md'
});

Npm.depends({
  'he': '1.1.1',
  'twitter': '1.7.0',
});

var S = 'server';
var C = 'client';
var CS = [C, S];

Package.onUse(function(api) {
    api.versionsFrom('1.4.1');
    // Core
    api.use([
      'ecmascript',
      'mongo',
      'promise',
      'accounts-base',
      'accounts-password@1.3.3',
      'accounts-twitter',
      'oauth1'
    ]);
    // 3rd party
    api.use([
      'tapfuse:collection-global@2.0.0',
      'matb33:collection-hooks@0.8.4'
    ]);
    api.mainModule('lib/collection-server-tp_tweetCache.js', S);
    api.mainModule('lib/collection-server-tp_tweetQueries.js', S);
    api.mainModule('lib/twitter-api-streaming.js', S);
});

Package.onTest(function(api) {
});
