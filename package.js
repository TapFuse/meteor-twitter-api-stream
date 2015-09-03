Package.describe({
  name: 'tapfuse:twitter-api-streaming',
  version: '0.0.1',
  summary: 'npm twitter package wrapper',
  git: '',
  documentation: 'README.md'
});

var S = 'server';
var C = 'client';
var CS = [C, S];

Package.onUse(function(api) {
  api.versionsFrom('1.1.0.3');
  //Dependency
  api.use('accounts-twitter', S);
  api.use('oauth1', S);
  api.use('tapfuse:twitter-api', S);
  //Files
  api.addFiles('twitter-api-streaming.js', S);
});

Package.onTest(function(api) {
});