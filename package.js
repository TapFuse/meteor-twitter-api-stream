Package.describe({
  name: 'tapfuse:twitter-api-streaming',
  version: '1.2.0',
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
  api.use('accounts-twitter');
  api.use('mongo');
  api.use('oauth1');
  //Dependency
  api.use('tapfuse:collection-global@1.0.0');
  api.use('tapfuse:twitter-api@1.0.0');
  api.use('fongandrew:find-and-modify@0.2.1');
  //Files
  api.addFiles('twitter-api-streaming.js', S);
  api.addFiles('globals-client.js', C);
  api.addFiles('globals-server.js', S);
});

Npm.depends({
  "he": "0.5.0"
});

Package.onTest(function(api) {
});
