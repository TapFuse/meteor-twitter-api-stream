Package.describe({
  name: 'tapfuse:twitter-api-streaming',
  version: '2.3.0',
  summary: 'Tweet caching',
  git: '',
  documentation: 'README.md'
});

var S = 'server';
var C = 'client';
var CS = [C, S];

Package.onUse(function(api) {
  api.versionsFrom('1.2.0.1');
  api.use('ecmascript');
  api.use('accounts-base');
  api.use('accounts-password@1.1.11');
  api.use('accounts-twitter');
  api.use('mongo');
  api.use('oauth1');
  api.use('matb33:collection-hooks@0.8.1');
  //Dependency
  api.use('tapfuse:collection-global@2.0.0');
  api.use('tapfuse:twitter-api@1.0.0');
  api.use('fongandrew:find-and-modify@0.2.2');
  //Files
  api.addFiles('lib/collection-server-tp_tweetCache.js', S);
  api.addFiles('lib/collection-server-tp_tweetQueries.js', S);
  api.addFiles('lib/collection-client.js', C);
  api.addFiles('twitter-api-streaming.js', S);
});

Npm.depends({
  "he": "0.5.0"
});

Package.onTest(function(api) {
});
