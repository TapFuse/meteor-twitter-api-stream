import { Collection } from 'meteor/tapfuse:collection-global';
Collection.tp_tweetQueries = new Mongo.Collection('tp_tweetQueries');

Collection.tp_tweetQueries.allow({
  insert: function(userId) {
    return isAdminById(userId);
  },
  update: function(userId) {
    return isAdminById(userId);
  },
  remove: function(userId) {
    return isAdminById(userId);
  },
});

// Collection.tp_tweetQueries.before.insert(function(userId, doc) {
//   doc.isDeleted = false;
// });

Collection.tp_tweetQueries.after.update(function(userId, doc, fieldNames, modifier) {
  if (doc.isDeleted) {
    Collection.tp_tweetQueries.remove({_id: doc._id});
  }
});
