tp_tweetCache = new Mongo.Collection('tp_tweetCache');
Collection.tp_tweetCache = tp_tweetCache;

Collection.tp_tweetCache.allow({
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

Collection.tp_tweetCache.before.insert(function(userId, doc) {
  doc.isDeleted = false;
});

Collection.tp_tweetCache.after.insert(function(userId, doc) {
  doc.isDeleted = false;
});

// Collection.tp_tweetCache.after.update(function(userId, doc, fieldNames, modifier) {
//   if (doc.isDeleted) {
//     Collection.tp_tweetCache.remove({_id: doc._id});
//   }
// });
